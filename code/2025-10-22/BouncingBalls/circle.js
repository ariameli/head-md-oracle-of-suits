class Circle {
  constructor() {
    let x = width / 2;
    let y = 40;
    this.r = 10;
    this.c = random(colorPalette);
    this.done = false;

    this.body = Bodies.circle(x, y, this.r, { restitution: 0.6 });

    let velocity = Vector.create(random(-1, 1), random(-1, 1));
    Body.setVelocity(this.body, velocity);
    Composite.add(engine.world, this.body);
  }

  display() {
    fill(this.c);
    ellipse(this.body.position.x, this.body.position.y, this.r * 2, this.r * 2);
  }

  checkDone() {
    if (this.body.position.y > height + this.r * 2) {
      this.done = true;
    } else {
      this.done = false;
    }
  }

  removeCircle() {
    Composite.remove(engine.world, this.body);
  }
}
