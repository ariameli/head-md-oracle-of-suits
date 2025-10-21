class Round {
  constructor(x, y, r, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.angle = 0;
    this.c = color;
  }

  display() {
    noStroke();
    fill(this.c);
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    ellipse(0, 0, this.r - offset, this.r - offset);
    pop();
  }
}
