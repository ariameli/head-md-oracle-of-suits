class Block {
  constructor(x, y, c, sizeBlock) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.c = c;
    this.sizeBlock = sizeBlock;
  }

  display() {
    noStroke();
    fill(this.c);
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    rect(0, 0, this.sizeBlock - offset, this.sizeBlock - offset);
    pop();
  }
}
