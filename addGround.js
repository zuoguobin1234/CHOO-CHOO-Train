const { Graphics } = PIXI;

export function addGround(app) {
  const width = app.screen.width;

  // 创建并绘制最底部的地面图形。
  const groundHeight = 20;
  const groundY = app.screen.height;
  const ground = new Graphics()
    .rect(0, groundY - groundHeight, width, groundHeight)
    .fill({ color: 0xdddddd });

  // 把地面添加到舞台。
  app.stage.addChild(ground);

  // 定义轨道的总高度，包含「枕木层」和「铁轨层」两部分。
  const trackHeight = 15;

  // 定义枕木的尺寸与相关参数。
  const plankWidth = 50;
  const plankHeight = trackHeight / 2;
  const plankGap = 20;
  const plankCount = width / (plankWidth + plankGap) + 1;
  const plankY = groundY - groundHeight;

  // 创建数组，用来保存所有枕木的引用。
  const planks = [];

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

  // 创建并绘制铁轨长条。
  const railHeight = trackHeight / 2;
  const railY = plankY - plankHeight;
  const rail = new Graphics()
    .rect(0, railY - railHeight, width, railHeight)
    .fill({ color: 0x5c5c5c });

  // 把铁轨添加到舞台。
  app.stage.addChild(rail);

  // 只让枕木参与动画，用来模拟地面在向后掠过。
  // 因为地面和铁轨都是纯色长条，移动它们看不出任何变化，所以不需要动画。
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
}
