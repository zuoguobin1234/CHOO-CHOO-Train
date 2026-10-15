const { Graphics } = PIXI;

export function addSmokes(app, train) {
  const groupCount = 5;
  const particleCount = 7;

  // 创建数组，用来保存所有烟雾组的引用。
  const groups = [];

  // 根据火车的位置确定烟雾的发射点（烟囱口）。
  const baseX = train.x + 170;
  const baseY = train.y - 120;

  for (let index = 0; index < groupCount; index++) {
    const smokeGroup = new Graphics();

    for (let i = 0; i < particleCount; i++) {
      // 随机化每个烟雾粒子的位置和半径。
      const radius = 20 + Math.random() * 20;
      const x = (Math.random() * 2 - 1) * 40;
      const y = (Math.random() * 2 - 1) * 40;

      // 绘制一个烟雾粒子。
      smokeGroup.circle(x, y, radius);
    }

    // 用灰色一次性填充整组烟雾。
    smokeGroup.fill({ color: 0xc9c9c9 });

    // 摆放烟雾组的位置。
    smokeGroup.x = baseX;
    smokeGroup.y = baseY;

    // 给烟雾组添加自定义属性 tick，用来保存当前动画进度（取值范围 0~1）。
    smokeGroup.tick = index * (1 / groupCount);

    // 把烟雾组添加到舞台，并存入引用数组。
    app.stage.addChild(smokeGroup);
    groups.push(smokeGroup);
  }

  // 让烟雾组动起来。
  app.ticker.add((time) => {
    // 计算每帧动画进度的增量。
    const dt = time.deltaTime * 0.01;

    groups.forEach((group) => {
      // 更新动画进度，超过 1 就回到 0，实现循环播放。
      group.tick = (group.tick + dt) % 1;

      // 根据动画进度更新烟雾组的位置、缩放和透明度。
      group.x = baseX - Math.pow(group.tick, 2) * 400;
      group.y = baseY - group.tick * 200;
      group.scale.set(Math.pow(group.tick, 0.75));
      group.alpha = 1 - Math.pow(group.tick, 0.5);
    });
  });
}
