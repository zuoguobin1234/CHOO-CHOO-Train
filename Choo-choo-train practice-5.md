# Choo-choo-train practice-5

## 一、整体作用

这段代码画的是**画面最底部的「地面 + 铁轨」**，并且让**枕木（planks）向左滚动**，模拟"列车向前行驶、地面向后掠过"的效果。

视觉结构（自下而上三层）：

```plaintext
 y = H-35  ┌──────────────────────────┐
           │  铁轨 rail  0x5c5c5c     │  高 7.5
 y = H-27.5├──────────────────────────┤
           │▮▮▮  ▮▮▮  ▮▮▮  ▮▮▮  ▮▮▮   │  枕木 0x241811 高 7.5（会滚动）
 y = H-20  ├──────────────────────────┤
           │  地面 ground 0xdddddd    │  高 20
 y = H     └──────────────────────────┘
```

---

## 二、第一层：地面（静态纯色条）

```actionscript
  // 创建并绘制最底部的地面图形。
  const groundHeight = 20;
  const groundY = app.screen.height;
  const ground = new Graphics()
    .rect(0, groundY - groundHeight, width, groundHeight)
    .fill({ color: 0xdddddd });
  // 把地面添加到舞台。
  app.stage.addChild(ground);
```

**v8 的 **`rect(x, y, w, h)`：参数是**左上角坐标 + 宽高**，不是中心点。

所以 `rect(0, H-20, W, 20)` = 从 `(0, H-20)` 向右画 `W`、向下画 `20` → 正好贴着屏幕底部的一条带子。

`width = app.screen.width` 保证它横向铺满屏幕。

---

## 三、第二层：枕木（会滚动的图案层）

### 1. 参数与层叠关系

```actionscript
  // 定义轨道的总高度，包含「枕木层」和「铁轨层」两部分。
  const trackHeight = 15;
  // 定义枕木的尺寸与相关参数。
  const plankWidth = 50;
  const plankHeight = trackHeight / 2;
  const plankGap = 20;
  const plankCount = width / (plankWidth + plankGap) + 1;
  const plankY = groundY - groundHeight;
```

- `trackHeight = 15` 是**轨道总高**，被平均分成两半：枕木 7.5 + 铁轨 7.5；
- `plankY = groundY - groundHeight` = `H - 20` → 即**地面的顶边**，作为枕木的"地基线"；
- `plankWidth + plankGap = 70` 是**每根枕木占据的槽位宽度**（记作 `S`）；
- `plankCount = W / 70 + 1`，`+1` 依旧是多备一根在屏幕右侧待命。

### 2. 摆放

```actionscript
  for (let index = 0; index < plankCount; index++) {
    // 创建并绘制一根枕木。
    const plank = new Graphics()
      .rect(0, plankY - plankHeight, plankWidth, plankHeight)
      .fill({ color: 0x241811 });

    // 摆放枕木，让它们横向铺满屏幕。
    plank.x = index * (plankWidth + plankGap);

    // 把枕木添加到舞台，并存入引用数组。
    app.stage.addChild(plank);
    planks.push(plank);
  }
```

**注意这里原点在左边缘**（`rect` 从 `x = 0` 开始画），所以一根枕木占据的是 `[plank.x, plank.x + 50]`。这一点直接决定了后面回收阈值的写法（见第五节）。

`plankY - plankHeight = H - 20 - 7.5` → 枕木画在地面顶边**之上**。

---

## 四、第三层：铁轨（静态纯色条）

```actionscript
  // 创建并绘制铁轨长条。
  const railHeight = trackHeight / 2;
  const railY = plankY - plankHeight;
  const rail = new Graphics()
    .rect(0, railY - railHeight, width, railHeight)
    .fill({ color: 0x5c5c5c });

  // 把铁轨添加到舞台。
  app.stage.addChild(rail);
```

`railY = plankY - plankHeight = H - 27.5` → 也就是**枕木的顶边**，铁轨正好压在枕木上面。

### 🔑 全篇最重要的设计思想：只有「有图案」的东西才需要动画

```plaintext
  // 只让枕木参与动画，用来模拟地面在向后掠过。
  // 因为地面和铁轨都是纯色长条，移动它们看不出任何变化，所以不需要动画。
```

这是个非常值得记住的优化思路：

> **平移一个纯色矩形，画面在视觉上完全不变**（左端移走一块灰色、右端补上一块一模一样的灰色，肉眼无法分辨）。

所以地面和铁轨做成**静态不动**的整条色带即可，只让**有间隔的枕木**滚动来"暗示"运动。省掉了 2/3 的动画计算，效果却完全一样。

**判断标准很简单**：物体在运动方向上如果是**均匀无特征**的，就不需要动；如果有**重复图案**（枕木、树、山），就必须动。

---

## 五、滚动与回收

```actionscript
  app.ticker.add((time) => {
    // 计算每帧枕木需要移动的距离。
    const dx = time.deltaTime * 6;

    planks.forEach((plank) => {
      // 让枕木向左移动。
      plank.x -= dx;

      // 当枕木移出屏幕左侧时，把它挪回队列最右侧。
      if (plank.x <= -(plankWidth + plankGap)) {
        plank.x += plankCount * (plankWidth + plankGap) + plankGap * 1.5;
      }
    });
  });
```

### 1. 阈值 `-（plankWidth + plankGap）= -70`

原点在左边缘，枕木占 `[x, x+50]`。当 `x = -70` 时，右边缘 = `-20` → 完全移出屏幕，还多留了 20px 余量。

对比前两节：

| 图层 | 原点位置 | 回收阈值 |
| --- | --- | --- |
| 山脉组 | 左上角 | `-整组宽` |
| 树 | **中心** | `-(半宽 + gap)` |
| 枕木 | **左边缘** | `-(整宽 + gap)` |

**原点在哪，决定了阈值怎么算** —— 这是无限滚动里最容易写错的地方。

### 2. 速度 `dx = deltaTime * 6` → 360 px/秒

这是整个场景里**最快的一层**：

| 图层 | 系数 | px/秒 |
| --- | --- | --- |
| 山脉 | 0.5 | 30 |
| 树 | 3 | 180 |
| **枕木/地面** | **6** | **360** |

速度差形成**视差**：越靠近观察者（画面下方）移动越快，纵深感应运而生。

### 3. ⚠️ 和 `addTrees` 相同的精度 Bug

回收位移应该是 **真实根数 × 槽位宽**，但代码用了小数 `plankCount` 又额外加了 `plankGap * 1.5`：

以 `W = 1920` 计算：

| 项 | 值 |
| --- | --- |
| `plankCount`（小数） | `1920/70 + 1 = 28.43` |
| 实际根数 `n` | `29` |
| 代码位移 | `28.43 × 70 + 30 = 2020.1` |
| 正确位移 `n × 70` | `2030` |
| **误差** | **−9.9 px** |

后果：队列里会**周期性出现一处间距只有 \~60px**（正常 70px）的偏窄空隙，滚动时能看到轻微不齐。

**修法**（和 `addTrees` 一样）：

```js
const plankCount = Math.ceil(width / (plankWidth + plankGap)) + 1; // 先取整
// ...
if (plank.x <= -(plankWidth + plankGap)) {
  plank.x += planks.length * (plankWidth + plankGap); // 用真实根数
}
```

---

## 六、层级顺序（`addChild` 的 z 序）

代码里的添加顺序是：

```plaintext
① ground   → 最底层
② planks×29 → 压在地面上
③ rail     → 最上层（压住枕木）
```

**后 **`addChild`** 的画在上面**。这个顺序是必须的：铁轨要在最上面才能"架在枕木上"，枕木要在地面之上才不会陷进去。如果调换顺序，画面就穿帮了。

---

## 七、知识点清单

| 知识点 | 本代码体现 |
| --- | --- |
| `rect(x, y, w, h)` 是**左上角 + 宽高** | 三层条带都用 |
| 原点位置决定回收阈值算法 | 左边缘 → 用整宽 |
| **纯色条不需要动画** | 只动枕木（核心优化思想） |
| 环形队列无缝滚动 | 阈值判断 + 固定位移 |
| `deltaTime` 帧率无关 | `dx = deltaTime * 6` |
| 视差分层速度 | 0.5 / 3 / 6 三档 |
| `addChild` 顺序 = z 序 | 地面 → 枕木 → 铁轨 |
| 相对布局（`app.screen`） | 宽高都随屏幕 |

---

## 八、可以改进的点

1. **回收位移取整**（第五节）：改用 `planks.length * (plankWidth + plankGap)`。
2. `plankCount`** 用 **`Math.ceil`** 取整**，避免小数参与循环。
3. **29 个独立 **`Graphics`** 有点浪费**：更优做法是把所有枕木画进**一个 **`Graphics`，然后复制成两组像山脉那样整体滚动（draw call 从 29 降到 2）；或者 `generateTexture()` 后用 `Sprite` 复用。
4. **resize 不自适应**：`width`、地面/铁轨宽度、枕木数量都是初始化时算死的，窗口变宽会露空。
5. **地面/铁轨只有 **`W`** 宽**：一旦窗口变宽就会露出右边的缺口，建议画成 `W * 2` 或监听 resize 重建。
6. **函数没有返回值**：建议 `return { ground, rail, planks }`，方便外部暂停或变速。
