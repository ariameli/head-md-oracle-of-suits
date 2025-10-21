class StraightLine {
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
    rect(0, 0, this.sizeBlock, size);
    pop();
  }

  move() {
    // If the mouse is moving check the distance between mouse and block
    let distance;
    if (pmouseX - mouseX != 0 || pmouseY - mouseY != 0) {
      distance = dist(mouseX, mouseY, this.x, this.y);
      if (distance < distMouse) {
        this.angle += 1;
      }
    }
    if (distance < distMouse) {
      this.angle += 1;
    }

    // If squares already rotating, keep rotating until 180 degrees
    if (this.angle > 0 && this.angle < 180) {
      this.angle += 1;
    } else {
      this.angle = 0;
    }
  }
}
