# Choo-choo-train practice-4

这段代码实现的是**无限滚动的树（前景层）**，和上一节的 `addMountains` 是同一套思路，但换成了「**多个独立对象 + 数组管理**」的方案。下面详细拆解。

---

## 一、整体作用

```plaintext
   /\      /\      /\      /\      ← 树冠（4 层三角形）
   ||      ||      ||      ||      ← 树干
─────────────────────────────────  ← 地面 y = H - 20
   ←←←← 向左滚动 ←←←←
```

树以固定速度左移，移出屏幕后跳回队列最右侧，形成无限滚动。因为速度比山脉快得多，两者叠加就产生了**视差**（见第六节）。

---

## 二、布局参数：先算清「要种几棵树」

```actionscript
  // Width of each tree.
  const treeWidth = 200;
  // Position of the base of the trees on the y-axis.
  const y = app.screen.height - 20;
  // Spacing between each tree.
  const spacing = 15;
  // Calculate the number of trees needed to fill the screen horizontally.
  const count = app.screen.width / (treeWidth + spacing) + 1;
```

| 变量 | 值 | 含义 |
| --- | --- | --- |
| `treeWidth` | `200` | 树冠**最宽处**的宽度（固定） |
| `y` | `H - 20` | 树根所在的 y（离屏幕底 20px） |
| `spacing` | `15` | 相邻树的间隙 |
| `treeWidth + spacing` | `215` | **一棵树占据的槽位宽度**（下面记作 `S`） |

`count = W / S + 1`：`+1` 是为了**多准备一棵待命在屏幕右侧**，否则滚动时会露出空档。

举例：屏幕宽 `1920` → `count = 1920/215 + 1 = 9.93`。

> ⚠️ `count`** 是小数**，`for (let index = 0; index < count; index++)` 实际会跑 **10 次**（`index` 取 0\~9）。这个小数在后面的回收逻辑里会引发精度问题，见第五节。

---

## 三、创建并摆放每一棵树

```actionscript
  for (let index = 0; index < count; index++) {
    // Randomize the height of each tree within a constrained range.
    const treeHeight = 225 + Math.random() * 50;
    // Create a tree instance.
    const tree = createTree(treeWidth, treeHeight);
    // Initially position the tree.
    tree.x = index * (treeWidth + spacing);
    tree.y = y;
    // Add the tree to the stage and the reference array.
    app.stage.addChild(tree);
    trees.push(tree);
  }
```

三个要点：

1. **高度随机 **`225 ~ 275`：树宽都一样，但高度各不相同 → 避免呆板，制造自然感。
2. **x 按槽位等距排列**：`0, 215, 430, 645 ...`，形成一个**均匀队列**。
3. `trees`** 数组保存引用**：因为后面动画里要逐个操作，必须留住引用（`Graphics` 加进 stage 后，如果不存数组，就得去 `app.stage.children` 里翻）。

---

## 四、`createTree`：一棵树是怎么画出来的

### 1. 关键设计：以「树根中心」为局部原点

这是整个函数最核心的思路。绘制时所有坐标都是**相对于树根**的：

```plaintext
        y = -height   ← 树冠顶（负 y 向上）
            /\
           /\
          /\
     ----- 0,0 -------  ← 原点 = 树根中心（贴在地面上）
          ||
          ||
```

所以：

- **向上 = 负 y**（因为屏幕坐标系 y 向下为正）
- **左右对称 = x 取 ±宽度/2**

好处：设置 `tree.y = H - 20` 就等于「把树根放在地面」，不管树多高都自动对齐地面。

### 2. 树干

```actionscript
function createTree(width, height) {
  // Define the dimensions of the tree trunk.
  const trunkWidth = 30;
  const trunkHeight = height / 4;
  // Define the dimensions and parameters for the tree crown layers.
  const crownHeight = height - trunkHeight;
  const crownLevels = 4;
  const crownLevelHeight = crownHeight / crownLevels;
  const crownWidthIncrement = width / crownLevels;
  // Define the colors of the parts.
  const crownColor = 0x264d3d;
  const trunkColor = 0x563929;

  const graphics = new Graphics()
    // Draw the trunk.
    .rect(-trunkWidth / 2, -trunkHeight, trunkWidth, trunkHeight)
    .fill({ color: trunkColor });
```

- 树干高 = 总高的 1/4，树冠占 3/4；
- `rect(x, y, w, h)` 是 v8 的矩形 API，参数是**左上角 + 宽高**；
- `x = -15, y = -trunkHeight, w = 30, h = trunkHeight` → 一个**居中、向上生长**的矩形。

### 3. 树冠：4 层三角形叠成松树

```actionscript
  for (let index = 0; index < crownLevels; index++) {
    const y = -trunkHeight - crownLevelHeight * index;
    const levelWidth = width - crownWidthIncrement * index;
    const offset = index < crownLevels - 1 ? crownLevelHeight / 2 : 0;
    // Draw a crown layer.
    graphics
      .moveTo(-levelWidth / 2, y)
      .lineTo(0, y - crownLevelHeight - offset)
      .lineTo(levelWidth / 2, y)
      .fill({ color: crownColor });
  }
```

逐层计算（`index` 从 0 = 最底层，到 3 = 顶层）：

| index | 底边 y | 层宽 | 顶点额外上移 |
| --- | --- | --- | --- |
| 0 | `-trunkHeight` | `200` | `+半个层高` |
| 1 | `-trunkHeight - 1×层高` | `150` | `+半个层高` |
| 2 | `-trunkHeight - 2×层高` | `100` | `+半个层高` |
| 3 | `-trunkHeight - 3×层高` | `50` | `0`（尖顶） |

画法：`moveTo(左下) → lineTo(顶点) → lineTo(右下) → fill()` —— **三个点自动闭合**成一个三角形。

`offset` 的作用是**让下面几层的顶点额外抬高半个层高**，使相邻两层**互相重叠**：

```plaintext
      /\         ← 顶层（offset = 0，尖）
     /  \
    /\  /\       ← 上一层底部压住下一层的尖 → 无缝隙
   /    \
```

如果去掉 `offset`，各层只是首尾相接，抗锯齿边缘会露出细缝。顶层 `offset = 0` 是为了保留尖尖的树顶。

> 绘制顺序：树干先画、树冠从**下往上**画，所以上层会盖住下层的顶部，形成自然的层次。

---

## 五、滚动与回收（重点：这里有个精度 Bug）

```actionscript
  app.ticker.add((time) => {
    // Calculate the amount of distance to move the trees per tick.
    const dx = time.deltaTime * 3;

    trees.forEach((tree) => {
      // Move the trees leftwards.
      tree.x -= dx;
      // Reposition the trees when they move off screen.
      if (tree.x <= -(treeWidth / 2 + spacing)) {
        tree.x += count * (treeWidth + spacing) + spacing * 3;
      }
    });
  });
```

### 1. 回收阈值为什么是 `-(treeWidth / 2 + spacing)`

**树的原点在中心**，所以树的右边缘 = `tree.x + treeWidth / 2`。

当 `tree.x = -(100 + 15) = -115` 时，右边缘 = `-115 + 100 = -15` → **整棵树完全移出屏幕左侧**（还多留了 15px 余量）。

对比 `addMountains` 用的是 `-整个组宽度`，这里是 `-半个树宽` —— 因为**原点位置不同**：山脉组的原点在左上角，树的原点在中心。这是很容易搞混的点。

### 2. ⚠️ Bug：回收位移量算错了

无缝循环的正确位移量应该等于\*\*「队列总长度」\*\*，即：

$$
D_{正确} = n \times S \quad (n = 实际树的棵数,\ S = 树宽 + 间距)
$$

因为所有树同步左移，任意时刻相邻树间距恒为 `S`；把最左边那棵往右挪 `n×S`，正好接在最右边那棵的后面一个槽位。

而代码写的是：

```js
tree.x += count * (treeWidth + spacing) + spacing * 3;
//        ↑ 小数            ↑ 又额外加了 45px
```

用 `W = 1920` 实测：

| 项 | 值 |
| --- | --- |
| `count`（小数） | `9.93` |
| 实际棵数 `n` | `10` |
| 代码位移 `D` | `9.93 × 215 + 45 = 2179.95` |
| 正确位移 `n×S` | `10 × 215 = 2150` |
| **误差** | **+29.95 px** |

后果：队列里会**周期性出现一个 245px 的异常空隙**（正常是 215px）。因为树本身只有 200 宽、间隙 15，多出 30px 的空洞在滚动时是**肉眼可见的抖动**。

**正确写法**：

```typescript
const count = Math.ceil(app.screen.width / (treeWidth + spacing)) + 1;  // 先取整
// ...
const slot = treeWidth + spacing;
if (tree.x <= -(treeWidth / 2 + spacing)) {
  tree.x += trees.length * slot;   // 用真实棵数，不多不少
}
```

用 `trees.length` 是最稳妥的——它永远是真实棵数。

### 3. `dx = time.deltaTime * 3`

`deltaTime` 是以 60fps 为基准的帧系数，所以这是 **60fps 下每帧 3px = 180 px/秒**，且与刷新率无关（120Hz 屏幕速度一样）。

---

## 六、视差效果：树和山为什么要不同速度

| 图层 | 速度 | 每秒位移 |
| --- | --- | --- |
| 山脉（`addMountains`） | `deltaTime * 0.5` | 30 px |
| 树（`addTrees`） | `deltaTime * 3` | 180 px |

**近处的物体移动快、远处的慢**，这是人眼判断距离的本能线索。树比山快 6 倍，大脑就会认为「树在近处、山在远处」，平面画面立刻有了纵深感。这就是**视差滚动（Parallax Scrolling）**。

再加一层（比如 `deltaTime * 6` 的草地/灌木）效果会更强烈。

---

## 七、知识点清单

| 知识点 | 体现位置 |
| --- | --- |
| **局部坐标系 / 锚点思维** | 树以「树根中心」为原点，向上是负 y |
| Graphics 路径 API v8 | `rect()` / `moveTo` / `lineTo` / `fill()` |
| 路径自动闭合 | 三个点 `fill()` 即三角形 |
| 同对象内绘制顺序 = 图层 | 树干 → 树冠自下而上 |
| 参数化 + 随机化 | 宽固定、高 `225~275` 随机 |
| `ticker` + `deltaTime` | 帧率无关动画 |
| 无缝循环（环形队列） | 阈值判断 + 固定位移回收 |
| 原点位置决定阈值算法 | 山脉用「整宽」、树用「半宽」 |
| 引用数组管理对象 | `trees.push(tree)` |
| 视差滚动 | 树 3× vs 山 0.5× |

---

## 八、其他可以改进的点

1. **回收位移 Bug**（第五节）：建议改成 `trees.length * (treeWidth + spacing)`。
2. `count`** 先取整**：`Math.ceil(...)`，避免小数参与循环和位移计算。
3. **每棵树一个 **`Graphics`：10 棵树 = 10 个独立绘制对象。数量少时无所谓，但要种上百棵树，正确做法是**画一棵 → **`app.renderer.generateTexture()`** 生成纹理 → 用 **`Sprite`** 复用**（纹理只上传一次 GPU）。
4. **resize 不自适应**：几何和数量都是初始化时按当时屏幕尺寸算的，窗口变宽会出现空档。
5. `trees`** 没返回**：和 `addMoon` 一样，建议 `return trees`，方便外部做暂停、变速等操作。
6. `y`** 变量遮蔽**：第 8 行的 `const y` 和第 73 行 `createTree` 里的 `const y` 是两个不同作用域的变量，名字相同容易看混，建议改名 `groundY` / `levelY`。
