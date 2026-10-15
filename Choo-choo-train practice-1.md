# Choo-choo-train practice-1

下面按「从基础概念 → 逐行原理 → 关键知识点 → 可以改进的地方」来讲。你的项目用的是 **PixiJS v8.22.0**（见 `pixi.js` 头部注释），而这段代码用的正是 v8 全新的 `Graphics` 链式 API。

---

## 一、这段代码整体上在干什么

一句话：**在舞台（**`app.stage`**）上一次性绘制 20 颗大小、亮度、朝向各不相同的小星星，当作星空背景。**

```javascript
  for (let index = 0; index < starCount; index++) {
    const x = (index * 0.78695 * app.screen.width) % app.screen.width;
    const y = (index * 0.9382 * app.screen.height) % app.screen.height;
    const radius = 2 + Math.random() * 3;
    const rotation = Math.random() * Math.PI * 2;

    graphics
      .star(x, y, 5, radius, 0, rotation)
      .fill({ color: 0xffdf00, alpha: radius / 5 });
  }

  app.stage.addChild(graphics);
```

关键点：**20 颗星星全部画进「同一个 **`Graphics`** 对象」里**，最后只把这一个对象挂到舞台上。

---

## 二、先补几个必备基础概念

### 1. `PIXI` 是从哪来的？

```javascript
const { Application, Sprite, Texture, Graphics, Assets } = PIXI; 
```

`index.html` 里用 `<script src="pixi.js"></script>` 加载的 UMD 包会在全局挂一个 `PIXI` 对象。这行是**对象解构**，等价于：

```javascript
const Graphics = PIXI.Graphics;
```

> 小提示：这里只有 `Graphics` 真正被用到，`Sprite / Texture / Assets` 是多余的，可以删掉（不影响运行，但属于无用变量）。

### 2. 显示列表（Display List）：舞台是一棵树

PixiJS 的核心是**显示对象树**：

```plaintext
app.stage  （根容器，舞台）
   └── graphics （你这 20 颗星星）
```

- `app.stage`是所有可见对象的根节点；
- 用 `addChild()`把对象挂上去，它才会被渲染；
- **后添加的对象画在上面**（层级顺序 = 数组顺序）。

所以如果你想让星星在最底层，应该在添加其它角色**之前**调用`addStars(app)`——你现在的`main.js`里正是这么做的。

### 3. 坐标系

**PixiJS 2D坐标系**和 Canvas 一样：**原点在左上角，x向右增大，y向下增大**，单位是「逻辑像素」。

`app.screen.width/height`就是画布的宽高（因为`main.js`里用了`resizeTo: window`，所以等于窗口尺寸）。

---

## 三、`Graphics`是什么（v8 最重要的变化）

`Graphics`是<u>***PixiJS的矢量绘图对象***</u>：用代码画圆、矩形、多边形、线段，然后由引擎把它\*\*三角化（tessellate）\*\*成三角形交给GPU渲染。

### v7 vs v8 写法对比（这是最容易踩坑的知识点）

```javascript
// v7 老写法
graphics.beginFill(0xffdf00, 0.8);
graphics.drawStar(x, y, 5, radius);
graphics.endFill();

// v8 新写法（你的代码）
graphics.star(x, y, 5, radius, 0, rotation).fill({ color: 0xffdf00, alpha: 0.8 });
```

v8 的规则是：**先「搭建路径」，再「填充 / 描边」，并且可以链式调用**。

- `.star(...)`：往当前路径里加入一个星形轮廓；
- `.fill(...)`：给**刚才那段路径**上色，同时**结束这段路径**（下一次 `.star()` 开始一段新路径）。

所以循环 20 次 = 20 段独立路径 = 20 个各自独立填充的形状。

### `star()` 的 6 个参数

```javascript
star(x, y, points, radius, innerRadius, rotation)
```

| 参数 | 含义 | 你的取值 |
| --- | --- | --- |
| `x, y` | 星形**中心点**坐标 | 低差异序列算出来的 |
| `points` | 角的个数 | `5` → 五角星 |
| `radius` | **外半径**（中心到尖角） | `2 ~ 5` 随机 |
| `innerRadius` | **内半径**（中心到凹点） | `0` → 尖角很锐利的星 |
| `rotation` | 整体旋转弧度 | `0 ~ 2π` 随机 |

`innerRadius = 0`意味着凹点塌到圆心，得到的是那种「尖尖的、像十字光芒」的星；如果给 `innerRadius = radius * 0.5`，就会变成圆润饱满的传统五角星。

### `fill({ color, alpha })`

v8 的填充样式是一个对象：

- `color: 0xffdf00` → 十六进制颜色，等价于 `rgb(255, 223, 0)`，金黄色；
- `alpha: radius / 5` → 透明度，**小星星暗、大星星亮**（见下文）。

---

## 四、位置计算：这一段是整段代码最巧的地方

```js
const x = (index * 0.78695 * app.screen.width) % app.screen.width;
const y = (index * 0.9382 * app.screen.height) % app.screen.height;
```

### 1. `%`（取模）在这里的作用：折返

`index * 0.78695 * width`会随着 index 增大而无限增长，取`% width`相当于**超出右边界就从左边绕回来**，把所有点都压进`[0, width)`区间内。

### 2. 为什么不用`Math.random()`定位置？

如果写`x = Math.random() * width`，20 个点会**扎堆、留大片空洞**（randomness天然会聚簇）。

这里的做法是：**用固定的小数步长「等间隔」前进，再取小数部分**。数学上：

$$
x_i = W \times \big( \operatorname{frac}(i \times 0.78695) \big)
$$

也就是**只取决于**`i × 常数`**的小数部分**。因为`0.78695`是个「不像简单分数」的数（接近黄金比例类常数），`i×0.78695`的小数部分会在 `[0,1)` 里**非常均匀地铺开**，不会重复、不会形成明显行列。

这在数学上叫**Weyl 序列 / 低差异序列（low-discrepancy sequence）**，也是`Fibonacci lattice` 的思路。它的好处：

- **点少的时候尤其均匀**：20 个点也能铺满整个屏幕；
- **看起来又不规则**：不像网格那样死板，视觉上仍然像随机星空；
- **可复现**：每次刷新位置完全一样（不像 random 每次都变）。

y 轴用`0.9382`而不是同一个数，是为了让两个方向**不同步**，避免所有星星排成一条斜线（这在数学上叫两个常数「互不整除 / 线性无关」）。

### 3. 一个附带好处：天然自适应屏幕

注意公式是 `index * 常数 * width`，所以点的**相对位置**（占屏幕的百分比）是固定的。窗口变宽，星星会按比例散开，而不是挤在左上角。

---

## 五、大小、亮度、朝向：制造「纵深感」

```js
const radius = 2 + Math.random() * 3;          // 2 ~ 5
const rotation = Math.random() * Math.PI * 2;  // 0 ~ 360°
...
.fill({ color: 0xffdf00, alpha: radius / 5 }); // 0.4 ~ 1.0
```

三处随机 + 一处联动：

1. **半径 2\~5**：大小不一 → 视觉上像「远近不同的星星」；
2. **旋转 0\~2π**：每颗星朝向不同 → 破掉规律感（如果全部朝上会非常假）；
3. **透明度 = radius / 5**：这是关键的一行。半径越大越不透明（越亮），半径越小越透明（越暗）。**小的 = 远的 = 暗的**，大脑会自动把它解读为「有深度的星空」，而不是一堆平面贴图。
4. `0xffdf00`金黄色 + `#021f4b`深蓝背景（`main.js`里设的），是经典的夜空配色。

> 注意：**位置是确定的，大小/亮度/朝向是随机的**。这个「确定性 + 随机性」组合是很实用的技巧：整体布局稳定，细节每次刷新略有变化。

---

## 六、性能上的知识点：为什么只用一个`Graphics`？

渲染里有个重要成本叫**draw call（一次让 GPU 画一批东西的指令）**，draw call 越少越好。

- 如果建 20 个`Sprite`或 20 个`Graphics`：舞台上有 20 个独立节点，要各自参与变换计算、剔除、批处理判断；
- 你的做法：**20 个形状合并进 1 个**`Graphics` → 舞台上只有 1 个节点，几何数据被打包成一批，基本就是 **1 次 draw call**。

对于背景这种「画完就不动了」的东西，这是正确的做法——相当于把星空\*\*烘焙（bake）\*\*成了一张静态图。

---

## 七、几个需要注意 / 可以改进的点

1. **没有保存引用**：函数结束后`graphics`这个局部变量就没了，之后想改（比如让星星闪烁）只能从 `app.stage.children`里翻。建议写成：
   ```js
   const graphics = new Graphics();
   // ...
   app.stage.addChild(graphics);
   return graphics;   // 返回引用，方便后续控制
   ```
2. **窗口 resize 后不会重排**：`resizeTo: window` 会让画布变大，但 `Graphics` 里的顶点坐标是写死的，星星不会重新分布（只是位置固定在旧区域内）。要响应 resize 需要监听 `window.resize` 后 `graphics.clear()` 再重画。
3. `Graphics`** 不能直接改 alpha 做动画**：`Graphics` 整体有 `alpha` 属性（会让 20 颗星一起变），但**单个形状**没有独立属性。想让某颗星单独闪烁，只能 `clear()` + 重新绘制，或者改用 `Sprite`。
4. **数量级更大时（几千颗）**：`Graphics` 每次重建路径的 CPU 三角化成本会变高，那时更好的做法是：先用 `Graphics` 画一颗星 → `app.renderer.generateTexture()` 生成纹理 → 用大量 `Sprite` / `ParticleContainer` 复用。
5. **第 1 行的多余解构**：只用到 `Graphics`，`Sprite / Texture / Assets` 可以删除。

---

## 一句话总结

> 这段代码的精华是：**用「低差异序列 + 取模」得到均匀又不规则的布局，用「随机大小联动透明度」制造纵深，再用 v8 的链式 **`Graphics`** API（**`.star().fill()`**）把 20 个形状烘焙进单个对象，以 1 次 draw call 画出一片廉价又好看的星空。**
