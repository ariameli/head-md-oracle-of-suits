export class Arrow {
  constructor() {
    this.pos = createVector(width / 2, height - 60); // near bottom center
    this.vel = createVector(0, 0);
    this.state = "idle"; // 'idle' | 'held' | 'launched' | 'stuck'
    this.radius = 6;
    this.speed = 18;
    this.respawnTimer = 0;
    this.length = 100; // longer shaft
  }

  hold(x, y) {
    if (this.state === "launched" || this.state === "stuck") return;
    this.pos.set(x, y);
    this.vel.set(0, 0);
    this.state = "held";
  }

  // Launch towards (tx,ty) but origin is current this.pos (hand)
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

    // shaft (longer)
    noStroke();
    fill(220);
    rectMode(CENTER);
    rect(-this.length * 0.15, 0, this.length, 6);

    // diamond head (playing-card diamond) at front
    fill(200, 60, 60);
    const hx = this.length * 0.5 + 2;
    beginShape();
    vertex(hx, 0);
    vertex(hx - 12, -10);
    vertex(hx - 24, 0);
    vertex(hx - 12, 10);
    endShape(CLOSE);

    pop();
  }

  // keep checkHit simple; caller will handle removal/reset
  checkHit(target) {
    if (this.state !== "launched") return false;
    if (dist(this.pos.x, this.pos.y, target.x, target.y) <= target.radius) {
      this.state = "stuck";
      this.vel.set(0, 0);
      this.respawnTimer = 1.0; // short pause then reset
      return true;
    }
    return false;
  }

  reset() {
    this.state = "idle";
    this.pos.set(width / 2, height - 60);
    this.vel.set(0, 0);
    this.respawnTimer = 0;
  }
}
