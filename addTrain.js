const { Graphics, Container } = PIXI;

export function addTrain(app, container) {
  const head = createTrainHead(app);

  // 把车头添加到列车容器。
  container.addChild(head);

  // 把列车容器添加到舞台。
  app.stage.addChild(container);

  const scale = 0.75;

  // 调整列车的整体缩放。
  container.scale.set(scale);

  // 摆放列车位置，以适配不同的屏幕宽度。
  // 为了让列车保持画面主体，将它放在屏幕中心稍偏左的位置。
  container.x = app.screen.width / 2 - head.width / 2;
  container.y = app.screen.height - 35 - 55 * scale;
}

function createTrainHead(app) {
  // 创建一个容器，用来装车头的所有部件。
  const container = new Container();

  // 定义车头前部（锅炉）的尺寸。
  const frontHeight = 100;
  const frontWidth = 140;
  const frontRadius = frontHeight / 2;

  // 定义驾驶室（车厢）的尺寸。
  const cabinHeight = 200;
  const cabinWidth = 150;
  const cabinRadius = 15;

  // 定义烟囱的尺寸。
  const chimneyBaseWidth = 30;
  const chimneyTopWidth = 50;
  const chimneyHeight = 70;
  const chimneyDomeHeight = 25;
  const chimneyTopOffset = (chimneyTopWidth - chimneyBaseWidth) / 2;
  const chimneyStartX = cabinWidth + frontWidth - frontRadius - chimneyBaseWidth;
  const chimneyStartY = -frontHeight;

  // 定义车顶的尺寸。
  const roofHeight = 25;
  const roofExcess = 20;

  // 定义车门的尺寸。
  const doorWidth = cabinWidth * 0.7;
  const doorHeight = cabinHeight * 0.7;
  const doorStartX = (cabinWidth - doorWidth) * 0.5;
  const doorStartY = -(cabinHeight - doorHeight) * 0.5 - doorHeight;

  // 定义车窗的尺寸。
  const windowWidth = doorWidth * 0.8;
  const windowHeight = doorHeight * 0.4;
  const offset = (doorWidth - windowWidth) / 2;

  const graphics = new Graphics()
    // 绘制烟囱
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

    // 绘制车头前部
    .roundRect(
      cabinWidth - frontRadius - cabinRadius,
      -frontHeight,
      frontWidth + frontRadius + cabinRadius,
      frontHeight,
      frontRadius,
    )
    .fill({ color: 0x7f3333 })

    // 绘制驾驶室
    .roundRect(0, -cabinHeight, cabinWidth, cabinHeight, cabinRadius)
    .fill({ color: 0x725f19 })

    // 绘制车顶
    .rect(-roofExcess / 2, cabinRadius - cabinHeight - roofHeight, cabinWidth + roofExcess, roofHeight)
    .fill({ color: 0x52431c })

    // 绘制车门
    .roundRect(doorStartX, doorStartY, doorWidth, doorHeight, cabinRadius)
    .stroke({ color: 0x52431c, width: 3 })

    // 绘制车窗
    .roundRect(doorStartX + offset, doorStartY + offset, windowWidth, windowHeight, 10)
    .fill({ color: 0x848484 });

  // 定义车轮的尺寸。
  const bigWheelRadius = 55;
  const smallWheelRadius = 35;
  const wheelGap = 5;
  const wheelOffsetY = 5;

  // 创建所有车轮。
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

  // 把所有部件添加到容器。
  container.addChild(graphics, backWheel, midWheel, frontWheel);

  // 让车轮转动 —— 大轮的转速要比小轮按比例慢一些。
  app.ticker.add((time) => {
    const dr = time.deltaTime * 0.15;

    backWheel.rotation += dr * (smallWheelRadius / bigWheelRadius);
    midWheel.rotation += dr;
    frontWheel.rotation += dr;
  });

  return container;
}

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
