export class Target {
  constructor(x, y, radius = 150, rings = 5) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.rings = rings;
  }

  draw() {
    push();
    translate(this.x, this.y);
    noFill();
    strokeWeight(3);
    for (let i = 0; i < this.rings; i++) {
      const t = i / (this.rings - 1 || 1);
      // simple color ramp: outer lighter, inner darker
      stroke(255 * (1 - t), 100 * t + 50, 80 + 80 * t);
      const r = this.radius * (1 - i / this.rings);
      ellipse(0, 0, r * 2);
    }
    // bullseye
    noStroke();
    fill(255, 60, 60);
    ellipse(0, 0, this.radius * 0.28);
    pop();
  }

  isHit(px, py) {
    return dist(px, py, this.x, this.y) <= this.radius;
  }
}
