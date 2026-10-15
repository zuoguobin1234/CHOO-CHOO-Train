# Choo-choo-train practice-6

## 一、整体作用与文件分工

这段代码画的是**画面的主角：一列蒸汽火车的车头**，并且让三个车轮**按正确比例旋转**。

```plaintext
        ┌────────┐        ← 车顶 roof
        │ 门 / 窗 │        ← 驾驶室 cabin
        │        ╭────╮   ← 车头前部 front（向右伸出）
        │        │  ▓  │   ← 烟囱 chimney
  ╭───╮ ╰────────╯    │
  │大轮│  ○      ○    │   ← 3 个车轮
  ╰───╯───────────────╯
```

三个函数各司其职：

| 函数 | 职责 |
| --- | --- |
| `addTrain` | **装配与摆放**：把车头放进容器、缩放、定位到屏幕 |
| `createTrainHead` | **造车头**：车身各零件 + 三个轮子 + 轮子动画 |
| `createTrainWheel` | **造轮子**：一个可复用的轮子工厂 |

---

## 二、`Container`：这段代码最重要的新概念

### 1. 为什么要用容器？

```actionscript
const trainContainer = new Container();
...
addTrain(app, trainContainer);
```

`Container`（容器）是一个**看不见的盒子**，专门用来装其它显示对象。它的核心价值是：

> **父容器的变换（位移 / 缩放 / 旋转）会自动继承给所有子对象。**

```js
container.scale.set(0.75);   // 只写一行
container.x = ...;           // 只写一行
```

车头里的车身、3 个轮子、所有细节**全部一起缩放、一起移动**——你不需要对每个零件单独算坐标。

**这就是"分组"的意义**：把「一组东西」当成「一个东西」来操作。

未来你要加车厢，只要 `container.addChild(car1, car2)`，整列车就能统一缩放和移动。

### 2. 两层容器结构

```actionscript
app.stage
   └── trainContainer（外部传入，代表"整列车"）
         └── head（createTrainHead 返回，代表"车头"）
               ├── graphics（车身各零件，画在一个 Graphics 里）
               ├── backWheel
               ├── midWheel
               └── frontWheel
```

注意 `container` 是**从外部传进来的参数**，而不是在函数内部 `new` 的——这是刻意的设计，让调用方保有对整列车的控制权。

### 3. 子对象的坐标是「相对父容器」的

`backWheel.x = 55` 不是屏幕坐标，而是**距离 head 容器原点 55px**。这个「局部坐标」思想是理解整段代码的关键。

---

## 三、车头的局部坐标系

所有零件都用**同一个原点**来画：

> **原点 = 驾驶室的左下角（车底）**
> **向上 = 负 y**

```plaintext
 y=-210 ┌──────────┐ 车顶
 y=-200 │          │ 驾驶室顶
 y=-185 ├──────────┤
        │   门/窗   │
 y=-100 │     ╭────┴──╮ 车头前部
        │     │ 烟囱  │
 y=  0  ╰─────╯      │  ← 原点（车底）
 y=  60   ○  ○  ○     轮子底部
```

**为什么选车底作为原点？** 因为定位时只需要关心"车放在地面哪个位置"，至于车有多高，向上自动延伸即可（和 `addTrees` 里树根当原点是同一个思路）。

### 各零件的实际坐标（代入数字算出来）

| 零件 | 代码 | 实际占位 |
| --- | --- | --- |
| 驾驶室 | `roundRect(0, -200, 150, 200, 15)` | x `0~150`，y `-200~0` |
| 车头前部 | `roundRect(85, -100, 205, 100, 50)` | x `85~290`，y `-100~0` |
| 烟囱 | 路径 | x `200~250`，y `-170~-100` |
| 车顶 | `rect(-10, -210, 170, 25)` | x `-10~160`，y `-210~-185` |
| 车门 | `roundRect(22.5, -170, 105, 140, 15)` | 描边，不填充 |
| 车窗 | `roundRect(33, -159.5, 84, 56, 10)` | 实心灰块 |

### 几个细节

**① 车头前部是个「胶囊形」**

```js
.roundRect(85, -100, 205, 100, 50)
```

高度 100、圆角半径 50 = **高度的一半** → 左右两端自动变成完整的半圆，形状像一颗胶囊/药片。这是 `roundRect` 的经典用法。

**② 车顶为什么要 **`+ cabinRadius`

```js
.rect(-roofExcess / 2, cabinRadius - cabinHeight - roofHeight, cabinWidth + roofExcess, roofHeight)
//                     ↑ 15 - 200 - 25 = -210
```

车顶底部在 `-185`，而驾驶室顶部在 `-200` → **车顶故意往下压了 15px**（= `cabinRadius`）。

原因：`roundRect` 的驾驶室顶部有圆角，如果车顶正好贴在 `-200`，圆角处会露出缝隙/缺口。往下压一个圆角的量就能完全盖住。这是很实用的小技巧。

`roofExcess = 20` 让车顶左右各伸出 10px，形成屋檐。

**③ 门用 **`stroke`**、窗用 **`fill`

```js
.roundRect(...).stroke({ color: 0x52431c, width: 3 })   // 门：只描边
.roundRect(...).fill({ color: 0x848484 });              // 窗：只填充
```

`stroke()` 画**轮廓线**，`fill()` 画**实心块**。所以门是一个深色框，窗是嵌在门里的实心玻璃。

---

## 四、`quadraticCurveTo`：二次贝塞尔画烟囱

```actionscript
    .moveTo(chimneyStartX, chimneyStartY)
    .lineTo(chimneyStartX - chimneyTopOffset, chimneyStartY - chimneyHeight + chimneyDomeHeight)
    .quadraticCurveTo(
      chimneyStartX + chimneyBaseWidth / 2,
      chimneyStartY - chimneyHeight - chimneyDomeHeight,
      chimneyStartX + chimneyBaseWidth + chimneyTopOffset,
      chimneyStartY - chimneyHeight + chimneyDomeHeight,
    )
    .lineTo(chimneyStartX + chimneyBaseWidth, chimneyStartY)
    .fill({ color: 0x121212 })
```

签名：`quadraticCurveTo(cpx, cpy, x, y)` —— **只有一个控制点**（对比 `bezierCurveTo` 有两个）。

画法分四步：

```plaintext
   控制点 (225,-195)
        ·
      ╱   ╲            ← 二次贝塞尔（圆顶）
     ●     ●  (200,-145) → (250,-145)
     |     |
     ●─────●  (210,-100) → (240,-100)   ← 梯形侧壁
```

形成一个**下窄上宽 + 圆顶**的烟囱。

### ⚠️ 又是那个知识点：控制点不在曲线上

控制点 y = `-195`，但曲线**不会经过它**。二次贝塞尔在 `t = 0.5` 处：

$$
B(0.5) = 0.25 \times (-145) + 0.5 \times (-195) + 0.25 \times (-145) = -170
$$

**烟囱实际最高点是 **`-170`**，不是 **`-195`**。** 这和 `addMountains` 山峰那节的结论完全一致（那里也是只有 75%）。

---

## 五、🔑 `fill()` 和 `stroke()` 如何作用于「同一条路径」

这是 v8 里非常反直觉、但极其重要的机制。看轮子代码：

```js
.circle(0, 0, radius)
.fill({ color: 0x848484 })                                        // 填充圆形
.stroke({ color: 0x121212, width: strokeThickness, alignment: 1 }) // 描边——作用在同一个圆上
```

**为什么 **`.stroke()`** 描的是圆，而不是空路径？** 因为 `fill()` 之后并没有画新形状，引擎知道你还想对刚才那条路径操作。

内部用一个叫 `_tick` 的计数器实现：

| 操作 | 对`_tick`的影响 |
| --- | --- |
| `circle / rect / moveTo / lineTo …` | `_tick++`（新增了几何） |
| `fill()` / `stroke()` | `_tick = 0`（重置） |

- `_tick === 0`（上色后没画新东西）→ 复用上一条路径
- `_tick > 0`（上色后又画了新形状）→ 只作用于新形状

验证轮子代码：

```plaintext
.circle()        _tick = 1
.fill()          _tick≠0 → 用圆形；重置 _tick = 0
.stroke()        _tick=0 → 复用同一个圆 ✓（画出轮胎）
.rect().rect()   _tick = 2
.fill()          _tick≠0 → 用两个矩形 ✓（画出辐条）
```

**规则总结**：

```js
.circle(0,0,r).fill(red).stroke(black)      // 红底黑边，同一个圆 ✓
.circle(0,0,r).fill(red).rect(...).stroke() // stroke 只描矩形，圆不受影响
```

---

## 六、`createTrainWheel`：轮子的构造

```actionscript
function createTrainWheel(radius) {
  // 定义车轮的尺寸。
  const strokeThickness = radius / 3;
  const innerRadius = radius - strokeThickness;

  return (
    new Graphics()
      .circle(0, 0, radius)
      // 绘制轮体
      .fill({ color: 0x848484 })
      // 绘制轮胎（外圈）
      .stroke({ color: 0x121212, width: strokeThickness, alignment: 1 })
      // 绘制辐条
      .rect(-strokeThickness / 2, -innerRadius, strokeThickness, innerRadius * 2)
      .rect(-innerRadius, -strokeThickness / 2, innerRadius * 2, strokeThickness)
      .fill({ color: 0x4f4f4f })
  );
}
```

### 1. 三个关键设计

**① 圆心画在原点 **`(0, 0)`

这是必须的：**对象的 **`rotation`** 是绕自己的原点旋转的**。如果圆心不在原点，旋转时轮子会"甩"出去（像被拴着甩的链球），而不是原地打转。

**② **`alignment: 1`** = 内侧描边**

描边默认是以路径为中心向两侧各占一半（`alignment = 0.5`）。这里设成 `1` 表示**描边完全画在路径内侧**：

- 外边缘仍精确等于 `radius`（不会撑大轮子）
- 内边缘 = `radius - strokeThickness` = `innerRadius`

于是 `innerRadius` 正好是轮胎的内圈，辐条画到 `±innerRadius` 就**刚好顶到轮胎内沿**，严丝合缝。

> 取值规则：`0` = 完全外侧，`0.5` = 居中（默认），`1` = 完全内侧。

**③ 辐条 = 两个交叉矩形**

一个竖条 + 一个横条，组成十字形辐条。宽 `strokeThickness`、长 `innerRadius * 2`，居中摆放（`-strokeThickness/2` 和 `-innerRadius`），所以交点正好在圆心。

### 2. 三个轮子的摆放

```actionscript
  const backWheel = createTrainWheel(bigWheelRadius);
  const midWheel = createTrainWheel(smallWheelRadius);
  const frontWheel = createTrainWheel(smallWheelRadius);

  // 摆放车轮位置。
  backWheel.x = bigWheelRadius;
  backWheel.y = wheelOffsetY;
  midWheel.x = backWheel.x + bigWheelRadius + smallWheelRadius + wheelGap;
  midWheel.y = backWheel.y + bigWheelRadius - smallWheelRadius;
  frontWheel.x = midWheel.x + smallWheelRadius * 2 + wheelGap;
  frontWheel.y = midWheel.y;
```

代入数字：

| 轮子 | 半径 | 圆心 (x, y) | **底部 y** |
| --- | --- | --- | --- |
| backWheel | 55 | `(55, 5)` | `5 + 55 = 60` |
| midWheel | 35 | `(150, 25)` | `25 + 35 = 60` |
| frontWheel | 35 | `(225, 25)` | `25 + 35 = 60` |

**关键：三个轮子的底部都在 **`y = 60`**。**

小轮的圆心 y 必须更大（更靠下），公式是 `大轮圆心y + 大半径 - 小半径`。这样不同大小的轮子才都**站在同一条地平线上**——这是很多初学者画错的地方（直接让圆心对齐，结果小轮悬空）。

---

## 七、轮子动画：这里藏着一个物理公式

```actionscript
  // 让车轮转动 —— 大轮的转速要比小轮按比例慢一些。
  app.ticker.add((time) => {
    const dr = time.deltaTime * 0.15;

    backWheel.rotation += dr * (smallWheelRadius / bigWheelRadius);
    midWheel.rotation += dr;
    frontWheel.rotation += dr;
  });
```

### 为什么大轮要转得慢？

想象车轮在地上**纯滚动**（不打滑）：火车前进距离 = 轮子边缘滚过的弧长。

$$
\text{前进距离} = \text{转角} \times \text{半径} \quad \Rightarrow \quad \omega = \frac{v}{r}
$$

**角速度与半径成反比**。同样跑 100 米，大轮转的圈数少，小轮转的圈数多。

代码里 `dr` 是以**小轮**为基准的角速度增量，所以大轮要乘上：

$$
\frac{r_{小}}{r_{大}} = \frac{35}{55} \approx 0.636
$$

**如果三个轮子用同一个角速度，视觉上就像小轮在打滑**，是很容易被看穿的错误。这类"物理直觉"细节正是动画真实感的关键。

> `rotation` 的单位是**弧度**（不是角度），`2π` 为一整圈。`time.deltaTime` 依旧保证帧率无关。

---

## 八、缩放与定位（这里有个疏漏）

```actionscript
  const scale = 0.75;

  // 调整列车的整体缩放。
  container.scale.set(scale);

  // 摆放列车位置，以适配不同的屏幕宽度。
  // 为了让列车保持画面主体，将它放在屏幕中心稍偏左的位置。
  container.x = app.screen.width / 2 - head.width / 2;
  container.y = app.screen.height - 35 - 55 * scale;
```

### 1. `container.scale.set(0.75)`

`scale` 是 `ObservablePoint`，用 `.set(x, y)` 或 `.set(0.75)` 统一设置。缩放对**所有后代**生效。

### 2. ⚠️ `container.x` 漏乘了 `scale`

`head.width` 是**本地宽度**（约 300，从车顶 `-10` 到车头右端 `290`），不受父容器 scale 影响。

- 缩放后火车**实际屏幕宽度** = `300 × 0.75 = 225`
- 代码却按 `300` 的一半（150）来算偏移

结果：火车中心实际落在屏幕中心**左侧约 45px**。注释说是"故意偏左"，但这个偏移量其实是**忘记乘 **`scale`** 的副产品**，不是精确控制。

正确写法：

```js
container.x = app.screen.width / 2 - head.width * scale / 2;
```

### 3. `container.y` 的 `55` 略有误差

想让轮子底部（本地 `y = 60`）正好落在轨道顶面（`H - 35`），应该减 `60 * scale`：

```js
container.y = app.screen.height - 35 - (wheelOffsetY + bigWheelRadius) * scale;
//                                     ↑ 5 + 55 = 60
```

代码用了 `55`，导致轮子**陷进轨道约 3.75px**（`5 × 0.75`）。这个偏差很小，也可能是作者想让轮子"压实"在轨道上的刻意处理。

---

## 九、知识点清单

| 知识点 | 体现位置 |
| --- | --- |
| **Container 分组 + 变换继承** | `trainContainer` / `head` 两层容器 |
| 父容器一个变换，全家生效 | `container.scale.set(0.75)` |
| 子对象坐标是**相对父容器**的 | 所有零件坐标 |
| 局部原点选在「接地处」 | 车底 = `(0,0)` |
| `roundRect(x,y,w,h,r)` | 驾驶室 / 车头 / 门 / 窗 |
| 圆角半径 = 高度一半 → 胶囊形 | 车头前部 |
| `quadraticCurveTo` 二次贝塞尔 | 烟囱圆顶 |
| **控制点不在曲线上** | 烟囱实际高 -170 而非 -195 |
| `fill()` vs `stroke()` | 门描边、窗填充 |
| `_tick`** 机制：上色如何复用同一路径** | 轮子 fill→stroke |
| `alignment: 1` 内侧描边 | 轮胎 |
| **旋转绕原点** → 圆心必须画在原点 | 轮子 |
| **不同半径轮子底边对齐** | 小轮圆心下移 |
| **ω = v / r，角速度与半径成反比** | 大轮转得慢 |
| `rotation` 单位是弧度 | ticker 动画 |

---

## 十、可以改进的点

1. `container.x`** 漏乘 **`scale`（第七节）：应写成 `head.width * scale / 2`。
2. `container.y`** 用 **`60`** 更精确**：`wheelOffsetY + bigWheelRadius`。
3. **魔法数字 **`- 35`** 硬编码**：这个 `35` 来自 `addGround.js` 的轨道总高（`20 + 15`）。建议从 `addGround` 导出常量共享，否则改了地面高度火车就会悬空。
4. `app.ticker.add`** 写在 **`createTrainHead`** 内部**：每次调用都会注册一个新回调，且**没有保存引用无法移除**。重复调用 `addTrain` 会导致轮子越转越快（多个回调叠加）。建议把动画移到 `addTrain` 里，或返回 `container` 时一并管理生命周期。
5. **车轮可以用一个 **`Graphics`** 合并**：3 个轮子 + 车身共 4 个对象；数量少无所谓，但若加车厢，建议轮子生成纹理后复用 `Sprite`。
6. `createTrainWheel`** 可以参数化颜色**：现在颜色写死，加几个参数就能造出不同风格的轮子。
7. **resize 不自适应**：位置和缩放都是初始化时算死的。
