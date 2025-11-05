export class Arrow {
  constructor() {
    this.pos = createVector(width / 2, height - 120);
    this.vel = createVector(0, 0);
    this.state = "idle"; // 'idle' | 'held' | 'launched' | 'stuck'
    this.radius = 10;
    this.speed = 18;
    this.respawnTimer = 0;
  }

  hold(x, y) {
    if (this.state === "launched" || this.state === "stuck") return;
    this.pos.set(x, y);
    this.vel.set(0, 0);
    this.state = "held";
  }

  launch(tx, ty) {
    if (this.state !== "held") return;
    const dir = createVector(tx - this.pos.x, ty - this.pos.y);
    if (dir.mag() < 1) dir.set(0, -1);
    this.vel = dir.normalize().mult(this.speed);
    this.state = "launched";
  }

  update() {
    if (this.state === "launched") {
      this.pos.add(this.vel);
    } else if (this.state === "stuck") {
      this.respawnTimer -= deltaTime / 1000;
      if (this.respawnTimer <= 0) this.reset();
    }
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    const angle =
      this.vel.mag() > 0.1 ? atan2(this.vel.y, this.vel.x) : -PI / 2;
    rotate(angle);
    noStroke();
    fill(220);
    // shaft
    rectMode(CENTER);
    rect(0, 0, this.radius * 2.5, 6);
    // arrow head
    fill(200, 60, 60);
    triangle(this.radius + 8, 0, this.radius - 2, -6, this.radius - 2, 6);
    pop();
  }

  checkHit(target) {
    if (this.state !== "launched") return false;
    if (dist(this.pos.x, this.pos.y, target.x, target.y) <= target.radius) {
      // stick to the target center for simplicity
      this.state = "stuck";
      this.vel.set(0, 0);
      // position the arrow roughly on the hit spot (towards center)
      //   const dir = createVector(
      //     this.pos.x - target.x,
      //     this.pos.y - target.y
      //   ).normalize();
      //   this.pos.set(
      //     target.x + dir.x * (target.radius * 0.2),
      //     target.y + dir.y * (target.radius * 0.2)
      //   );
      this.respawnTimer = 2.0; // seconds before reset
      return true;
    }
    return false;
  }

  reset() {
    this.state = "idle";
    this.pos.set(width / 2, height - 120);
    this.vel.set(0, 0);
    this.respawnTimer = 0;
  }
}
