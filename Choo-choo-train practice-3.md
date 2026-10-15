# Choo-choo-train practice-3

这段代码实现的是**无限循环滚动的山脉背景**——游戏里最常见的「跑酷式视差背景」。下面从基础讲起。

---

## 一、整体作用

```plaintext
屏幕:  [==== 可见区域 ====]
        ┌─────────────────┐
        │   /\    /\      │  ← 山脉（Graphics 矢量绘制）
        └─────────────────┘
```

山脉以固定速度**向左移动**，移出屏幕后从右边**无缝接回来**，形成永不间断的滚动效果。

实现思路是经典的\*\*「双缓冲拼接 / 无缝循环」**：准备**两份完全相同的山脉\*\*，首尾相接，轮流复用。

---

## 二、核心机制：为什么需要两组？怎么做到无缝？

```actionscript
  const group1 = createMountainGroup(app);
  const group2 = createMountainGroup(app);

  // Position the 2nd group off the screen to the right.
  group2.x = app.screen.width;

  // Add the mountain groups to the stage.
  app.stage.addChild(group1, group2);
```

设屏幕宽`W = app.screen.width`。每个山脉组的**宽度正好是W**（下面会验证）。

初始状态：

```plaintext
group1: x = 0      → 占据 [0,   W]   ← 屏幕上可见
group2: x = W      → 占据 [W,  2W]   ← 屏幕右侧待命
```

### 滚动与回收

```actionscript
  app.ticker.add((time) => {
    // Calculate the amount of distance to move the mountain groups per tick.
    const dx = time.deltaTime * 0.5;

    // Move the mountain groups leftwards.
    group1.x -= dx;
    group2.x -= dx;

    // Reposition the mountain groups when they move off screen.
    if (group1.x <= -app.screen.width) {
      group1.x += app.screen.width * 2;
    }
    if (group2.x <= -app.screen.width) {
      group2.x += app.screen.width * 2;
    }
  });
```

**关键数学**（这是整个算法最精妙的地方）：

两组始终同步`-= dx`，所以**它们的间距恒定为W**。

当`group1.x`减到`-W`（完全移出左边界）时：

- `group2.x`必然 = `-W + W = 0`（正好占据整个屏幕）
- 此时执行`group1.x += 2W` → `group1.x = -W + 2W = W`
- 于是`group1`落在`group2`右边，间距又是W ✅

```plaintext
回收前:  group1[-W, 0]   group2[0, W]
          ↑ 已在屏幕外         ↑ 正在显示

回收后:  group2[0, W]    group1[W, 2W]
          ↑ 正在显示          ↑ 待命
```

**两个必须注意的细节**：

1. **用**`+=`**而不是**`=`：如果写成`group1.x = W`，会丢掉超出的那一点点小数偏移（比如实际是`-W - 0.3`），接缝处会出现**抖动/跳帧**。`+=`保留了小数，保证绝对平滑。
2. **判断条件是**`&lt;= -W`**而不是**`&lt;= 0`：必须等整组**完全**移出屏幕才可回收，否则会看到山脉凭空消失。

---

## 三、`createMountainGroup`：一组山脉的几何

### 1. 三个尺寸参数

```actionscript
  // Width of all the mountains.
  const width = app.screen.width / 2;

  // Starting point on the y-axis of all the mountains.
  // This is the bottom of the screen.
  const startY = app.screen.height;

  // Start point on the x-axis of the individual mountain.
  const startXLeft = 0;
  const startXMiddle = Number(app.screen.width) / 4;
  const startXRight = app.screen.width / 2;
```

| 变量 | 值 | 含义 |
| --- | --- | --- |
| `width` | `W/2` | **每座山**的宽度 |
| `startY` | `H` | 山脚 = 屏幕底部 |
| `startXLeft` | `0` | 左山起点 |
| `startXMiddle` | `W/4` | 中山起点 |
| `startXRight` | `W/2` | 右山起点 |

**验证整组宽度**：右山从`W/2`开始，宽`W/2`，终点 = `W`。所以**整个组覆盖**`[0, W]`**，宽度正好等于屏幕宽** —— 这正是无缝拼接能成立的前提。

> 小瑕疵：`Number(app.screen.width)`的`Number()`是多余的，`app.screen.width`本来就是数字，三行写法不一致。

### 2. 高度与颜色

```actionscript
  const heightLeft = app.screen.height / 2;
  const heightMiddle = (app.screen.height * 4) / 5;
  const heightRight = (app.screen.height * 2) / 3;

  // Color of the individual mountain.
  const colorLeft = 0xc1c0c2;
  const colorMiddle = 0x7e818f;
  const colorRight = 0x8c919f;
```

- 中山最高（`0.8H`）**颜色最深** `0x7e818f` → 视觉上的主峰
- 右山次高（`0.667H`）中等色`0x8c919f`
- 左山最矮（`0.5H`）**颜色最浅** `0xc1c0c2` → 像远处的雾色

全部用**相对屏幕尺寸**计算，所以不同分辨率下比例一致。

---

## 四、贝塞尔曲线：山峰是怎么画出来的

```actionscript
  graphics
    // Draw the middle mountain
    .moveTo(startXMiddle, startY)
    .bezierCurveTo(
      startXMiddle + width / 2,
      startY - heightMiddle,
      startXMiddle + width / 2,
      startY - heightMiddle,
      startXMiddle + width,
      startY,
    )
    .fill({ color: colorMiddle })
```

### 1. 三步走：落笔 → 画曲线 → 填充

这是PixiJS v8的`Graphics`路径API（和`addStars.js`里的`.star().fill()`是同一套规则）：

1. `moveTo(x, y)`：**抬起画笔移动到起点**（山脚左侧）
2. `bezierCurveTo(...)`：画一条**三次贝塞尔曲线**到终点（山脚右侧）
3. `fill({ color })`：填充刚画的路径，并结束这段路径

### 2. 三次贝塞尔曲线

签名：`bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)`

- `(cp1x, cp1y)`、`(cp2x, cp2y)`是两个**控制点**
- `(x, y)`是**终点**

这里两个控制点**重合**在`(中点x, 顶点y)`，起点和终点都在屏幕底部，于是形成一个对称的山峰：

```plaintext
      ● ← cp1 = cp2（控制点，曲线不经过它！）
     / \
    /   \
   ●─────● ← 起点 / 终点（山脚）
```

### 3. ⚠️ 一个重要知识点：控制点 ≠ 曲线经过的点

这是新手最常误解的地方。**贝塞尔曲线不会经过控制点**，所以山峰的**实际高度低于**`height`**参数**。

代入中点`t = 0.5`的三次贝塞尔公式（起点终点都在`H`，两个控制点都在`H - h`）：

$$
B(0.5) = \tfrac{1}{8}H + \tfrac{3}{8}(H-h) + \tfrac{3}{8}(H-h) + \tfrac{1}{8}H = H - 0.75h
$$

**实际峰高只有**`height`**的75%**。比如`heightMiddle = 0.8H`，实际最高点只到`H - 0.6H = 0.4H`处。

如果你想让山峰**正好**达到指定高度，应该把控制点抬高`h / 0.75 ≈ 1.33h`，或者干脆用`lineTo`画折线峰。

---

## 五、绘制顺序 = 图层叠放顺序

```js
graphics
  .moveTo(...).bezierCurveTo(...).fill({ color: colorMiddle })   // ① 中山（最高）
  .moveTo(...).bezierCurveTo(...).fill({ color: colorLeft })     // ② 左山
  .moveTo(...).bezierCurveTo(...).fill({ color: colorRight });   // ③ 右山
```

**在同一个**`Graphics`**里，后画的覆盖先画的**（没有z-index，纯靠顺序）。

所以实际视觉：

```plaintext
  0 ───── W/4 ───── W/2 ───── W
  [ 左山  ][ 左山+中山 ][ 右山+中山 ]
          中山在最底层，只有高出的尖顶会露出来
```

形成「主峰在后面、左右两座较矮的山在前面」的层次感。

> 注意这和`addChild`的层级是两回事：`addChild`决定**对象之间**的叠放，路径绘制顺序决定**同一对象内部**的叠放。

---

## 六、`app.ticker`：动画循环

```actionscript
  app.ticker.add((time) => {
    // Calculate the amount of distance to move the mountain groups per tick.
    const dx = time.deltaTime * 0.5;
```

### 1. Ticker是什么

`app.ticker`是PixiJS内置的**帧循环调度器**，基于`requestAnimationFrame`，默认跟屏幕刷新率同步（通常60fps）。`add(fn)`注册的函数会在**每一帧渲染前**被调用。

### 2. `deltaTime`的意义（帧率无关性）

`time.deltaTime`是**以60fps为基准的帧时间系数**：

- 60fps时 ≈ `1.0`
- 120fps时 ≈ `0.5`（每帧时间减半）
- 30fps时 ≈ `2.0`

所以`dx = deltaTime * 0.5`表示「60fps下每帧移动0.5px」，即**30像素/秒**——**无论用户屏幕是60Hz还是144Hz，实际速度都一样**。这就是「帧率无关动画」的标准做法。

> v7 → v8的变化：v7里回调参数是**数字** `delta`；v8里传的是**Ticker实例**，所以要写`time.deltaTime`（另外还有`time.deltaMS`毫秒、`time.lastTime`总毫秒）。

---

## 七、知识点清单

| 知识点 | 在代码中的体现 |
| --- | --- |
| 无缝滚动 / 双缓冲拼接 | 两组山脉 + `+= 2W`回收 |
| 帧率无关动画 | `time.deltaTime` |
| Ticker帧循环 | `app.ticker.add()` |
| Graphics路径API v8 | `moveTo` / `bezierCurveTo` / `fill` |
| 三次贝塞尔曲线 | 山峰造型，控制点不落在曲线上 |
| 同对象内绘制顺序 = 图层顺序 | 中山先画 → 被左右山覆盖 |
| 相对布局（用`app.screen`比例） | 自适应不同分辨率 |
| `addChild(a, b)`批量添加 | 第13行 |

---

## 八、可以改进 / 需要注意的点

1. **窗口resize会露馅**：山脉几何是初始化时按当时屏幕尺寸「烘焙」的（`Graphics`顶点写死）。窗口变宽后，两组之间会出现**缝隙**；变窄则会重叠。要修复需监听`resize`，`clear()`后按新尺寸重画两组。
2. **回收判断用的是初始宽度**：`app.screen.width`在ticker里是实时读取的，但组的实际宽度是旧的——同样是resize问题的根源。
3. `Number()`**多余**：第47行可以去掉。
4. **只有单层速度**：真正的视差需要**多层不同速度**（远山慢、近山快）。可以复制这套逻辑做2\~3层，速度分别`0.2 / 0.5 / 1.0`。
5. \*\*颜色层次反了？\*\*按真实的大气透视，**远处应该更浅更淡**。这里最矮的左山最浅、最高的中山最深，属于风格化选择，不是错误——但如果你想更真实，可以把颜色反过来配。
