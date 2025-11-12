export class Target {
  constructor(x, y, radius = 60, speed = 3) {
    this.x = x;
    this.y = y;
    this.radius = 120;
    this.speed = speed;
    this.hit = false;
    this.scored = false;
    this.closeToMiddle = false;
  }
  update() {
    this.x -= this.speed;
  }
  draw() {
    push();
    translate(this.x, this.y);
    noStroke();
    fill("#969696");
    ellipse(0, 0, this.radius * 2);
    fill("#D9D9D9");
    ellipse(0, 0, this.radius * 1.33);
    fill(0);
    ellipse(0, 0, this.radius * 0.66);
    if (this.hit) {
      push();
      stroke(255, 220);
      strokeWeight(3);
      noFill();
      ellipse(0, 0, this.radius * 2.2);
      pop();
      imageMode(CORNER);
      if (window.arrowThrown) image(window.arrowThrown, 0, 0, 100, 100);
    }
    pop();
  }
  isOffscreen() {
    return this.x + this.radius < 0;
  }
  isHit(px, py) {
    return this.hit;
  }
  markHit() {
    if (this.hit) return;
    this.hit = true;
    window.hits += 1;
  }
  isCloseToMiddle() {
    return this.closeToMiddle;
  }
  markCloseToMiddle() {
    this.closeToMiddle = true;
  }
  notCloseToMiddle() {
    this.closeToMiddle = false;
  }
}
