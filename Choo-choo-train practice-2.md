# Choo-choo-train practice-2

下面把这份`addMoon.js`从最基础的概念讲起。它现在的作用是：<u>***把一个内联的SVG月亮图形变成PixiJS的矢量对象，放到屏幕右上方。***</u>

---

## 一、先搞懂整条链路

```plaintext
moonSvg.js（一串 SVG 文本）
      │  import
      ▼
new Graphics().svg(字符串)      ← 解析 SVG → 转成矢量路径
      │
      ▼
graphics.x / y = ...            ← 摆位置
      │
      ▼
app.stage.addChild(graphics)    ← 挂到舞台才会被渲染
      │
      ▼
return graphics                 ← 把引用交出去，方便后续动画
```

---

## 二、第1行：ES Module（模块系统）

```actionscript
import { moonSvgSource } from "./moonSvg.js";
const { Graphics } = PIXI;
```

### 1. `import` / `export`是一对

`moonSvg.js` 里用 `export const moonSvgSource = ...` 把变量「导出」，这里用 `import { moonSvgSource }` 「导入」。这就是原生 ES Module 语法（`index.html` 里 `<script type="module">` 开启的）。

几个必须知道的规则：

- **路径必须带**`./`：`"./moonSvg.js"`表示「当前目录」，不带`./`会被当成第三方包名。
- **导入的是「绑定」不是拷贝**：模块里的值变了，这里读到的也变。
- **模块是单例**：整个项目里`moonSvg.js`只会被执行一次，多处import共享同一个值。
- **模块自动是严格模式 + defer执行**：这是下一节的关键。

### 2. `const { Graphics } = PIXI;`为什么能拿到全局的`PIXI`？

`PIXI`不是import进来的，而是`index.html`里这行塞到`window`上的：

```html
<script src="pixi.js"></script><!-- 普通 script，同步执行，加载完就有 window.PIXI -->
<script src="main.js" type="module"></script>  <!-- module，defer，等 DOM 解析完才执行 -->
```

**普通 **`<script>`** 是同步阻塞的**，`type="module"` 默认是 defer（延迟到文档解析完成后执行）。所以执行顺序一定是：先有 `PIXI` → 再跑 `main.js` → 再跑 `addMoon.js`。这就是这行能工作的原因。

> 顺带一提：把这行写在**模块顶层**（而不是函数里），意味着整个模块只解构一次。如果写在函数里，每次调用都会重新取一次。

---

## 三、第8行：核心 —— `Graphics`与`.svg()`

```actionscript
  const graphics = new Graphics().svg(moonSvgSource);
```

这行做了两件事，拆开写更清楚：

```js
const graphics = new Graphics();  // 1. 造一个空的矢量绘图对象
graphics.svg(moonSvgSource);// 2. 把 SVG 文本解析进去（返回 this，所以能链式）
```

### 1. `Graphics`是什么？

`Graphics`是PixiJS的**矢量绘图对象**。你给它路径（圆、矩形、多边形、SVG），引擎会：

1. **三角化（tessellate）**：把所有曲线/多边形切成一堆三角形；
2. 上传顶点数据到GPU；
3. 渲染时用shader填充颜色。

它和`Sprite`（位图）最大的区别：

|   | `Graphics` | `Sprite` |
| --- | --- | --- |
| 本质 | 矢量几何（三角形） | 一张纹理图片 |
| 放大 | **不失真**（矢量） | 会模糊 |
| 适合 | 图形、线条、UI、SVG | 照片、角色贴图 |
| 复用成本 | 每个对象要重新三角化 | 纹理只上传一次，N个Sprite共享 |

### 2. `.svg()`内部发生了什么？

`.svg(source: string)`的流程大致是：

```plaintext
SVG 文本字符串
   → 浏览器 DOMParser 解析成 XML 文档
   → 遍历 <path> / <circle> / <rect> 等节点
   → 每个节点转成 PixiJS 的 GraphicsPath（内部是一堆贝塞尔曲线指令）
   → fill / stroke 样式转成 FillStyle / StrokeStyle
   → 最终三角化成 GPU 顶点
```

\*\*关键点：它要的是「字符串」，不是文件路径。\*\*这就是为什么我们把`moon.svg`的内容原封不动塞进了`moonSvg.js`的模板字符串里 —— 这样运行时不产生任何网络请求，也就彻底绕开了`fetch`的CORS限制。

> 兼容性提示：PixiJS的SVG解析只支持**一部分** SVG特性。`&lt;path>`、`&lt;circle>`、`&lt;rect>`、渐变、描边都能用；但\*\*`&lt;text>`、滤镜（filter）、`&lt;image>`、`clip-path`、mask通常不支持\*\*。所以从设计软件导出SVG前，最好把文字转成路径。

### 3. 顺带读懂你的SVG

```svg
export const moonSvgSource = `<svg width="111" height="126" viewBox="0 0 111 126" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd"
        d="M9.99794 104.751C44.7207 104.751 72.869 76.6028 72.869 41.8801C72.869 25.9516 66.9455
        11.4065 57.1812 0.327637C87.3034 4.98731 110.363 31.0291 110.363 62.4566C110.363 97.1793
        82.2144 125.328 47.4917 125.328C28.6975 125.328 11.8294 117.081 0.308472 104.009C3.46679
        104.498 6.70276 104.751 9.99794 104.751Z" fill="#FFDF00"/>
```

- `width="111" height="126"`：SVG的像素尺寸 → **决定了**`graphics.width / height`**就是111 × 126**。
- `viewBox="0 0 111 126"`：可视区域，这里和宽高一致，所以没有缩放。
- `d="M... C... Z"`：路径数据。`M` = 移动画笔，`C` = 三次贝塞尔曲线，`Z` = 闭合路径。
- `fill-rule="evenodd"`：**奇偶填充规则**——画笔绕了几圈决定某块区域算「内部」还是「外部」。月牙这种「一个大圆挖掉一个小圆」的形状，正是靠它在一**条**路径里挖出洞的（不需要写两个元素）。
- 两个`&lt;path>`：第一个填`#FFDF00`（亮金黄，月亮主体），第二个填`#DEC61A`（暗一点，做阴影层），叠出立体感。

---

## 四、第12–13行：坐标系与定位

```javascript
  graphics.x = app.screen.width / 2 + 100;
  graphics.y = app.screen.height / 8;
```

### 1. PixiJS的2D坐标系

**原点在左上角，x向右增大，y向下增大**（和Canvas一致，和数学课的笛卡尔坐标系y轴相反）。

所以：

- `x = 屏幕宽度/2 + 100` → **水平中线再往右100px**
- `y = 屏幕高度/8` → **顶部往下1/8处**（天空靠上的位置）

### 2. `app.screen`是什么

`app.screen`是渲染器的**逻辑尺寸**对象（`width` / `height`）。因为`main.js`里设了`resizeTo: window`，它等于窗口大小。用`app.screen`而不是写死数值，是为了让位置随窗口自适应。

### 3. ⚠️ 一个容易踩的坑：原点在左上角

`graphics.x / y`**定位的是这个对象的本地原点，而SVG解析出来的Graphics，原点在SVG画布的左上角，不是月亮的中心。**

所以上面这行实际上是把「月亮的左上角」放在了中线右100px处 —— **月亮整体会往右偏约55px**（111的一半）。注释里写的「减掉一半宽高」在当前代码里**并没有执行**，如果你想要精确居中，改成：

```javascript
graphics.x = app.screen.width / 2 + 100 - graphics.width / 2;
```

> v8的`Container`有`width` / `height` getter（内部走`getLocalBounds()`），可以直接读。

---

## 五、第16行：显示列表（Display List）

```actionscript
  app.stage.addChild(graphics);
```

PixiJS的核心是**显示对象树**，只有挂到树上的对象才会被渲染：

```plaintext
app.stage（根容器）
   ├── graphics（星星，addStars 加的）
   └── graphics（月亮，这里加的）
```

要点：

- `addChild()`把对象**追加**到子节点数组末尾；
- **后加的画在上面**（z序 = 数组顺序）。因为你先`addStars`后`addMoon`，月亮会盖在星星上面；
- 只有加到`stage`（或stage的后代）上，渲染器才会遍历到它。

---

## 六、第18行：为什么要`return graphics`

```actionscript
  return graphics;
```

如果不返回，函数一结束，局部变量`graphics`就被回收了，外面再也拿不到它 —— 想让月亮动起来就只能去`app.stage.children`里翻。

返回引用后就能在`main.js`里随意控制：

```javascript
const moon = addMoon(app);

// 缓慢上下浮动
app.ticker.add((time) => {
  moon.y = app.screen.height / 8 + Math.sin(time.lastTime / 1000) * 10;
  moon.rotation = Math.sin(time.lastTime / 2000) * 0.1;
});
```

这是**工厂函数**的常用写法：函数负责「创建并装配」，把成品交还给调用方。

---

## 七、总结：这段代码涉及的知识点清单

| 知识点 | 在本代码中的体现 |
| --- | --- |
| ES Module（`import` / `export`） | 第1行引入SVG源码 |
| 全局UMD + 解构 | `const { Graphics } = PIXI` |
| script执行顺序（同步vs defer） | 为什么`PIXI`一定已存在 |
| `Graphics`矢量绘图 & 三角化 | `new Graphics()` |
| `.svg()`只认字符串 | 所以SVG要内联 |
| SVG基础（`viewBox` / `path` / `fill-rule`） | `moonSvg.js` |
| 屏幕坐标系（原点左上、y向下） | `x / y`赋值 |
| 显示列表 / `addChild` / z序 | 第16行 |
| 工厂函数返回引用 | `return graphics` |

## 两个可以改进的点

1. **居中偏移**：如第四节所说，加`- graphics.width / 2`才是真正的水平居中。
2. **resize不跟随**：位置是一次性算好的，窗口改变后月亮不会重新定位。要自适应的话需要监听`window.resize`并重设`x / y`（背景星星同理）。
