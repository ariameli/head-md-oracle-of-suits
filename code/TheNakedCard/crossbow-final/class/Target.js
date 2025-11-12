class Target {
  constructor(x, y, radius = 60, speed = 3) {
    this.x = x;
    this.y = y;
    this.radius = 120;
    this.speed = speed;
    this.hit = false; // mark when this target was hit
    this.scored = false; // ensure a target only scores once
    this.closeToMiddle = false;
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    push();
    translate(this.x, this.y);
    noStroke();

    // outer (largest)
    fill("#969696");
    ellipse(0, 0, this.radius * 2);

    // middle
    fill("#D9D9D9");
    ellipse(0, 0, this.radius * 1.33);

    // center
    fill(0);
    ellipse(0, 0, this.radius * 0.66);

    // if hit, draw an overlay mark (subtle)
    if (this.hit) {
      push();
      stroke(255, 220);
      strokeWeight(3);
      noFill();
      ellipse(0, 0, this.radius * 2.2);
      pop();
      imageMode(CORNER);
      image(arrowThrown, 0, 0, 100, 100);
    }

    pop();
  }

  isOffscreen() {
    return this.x + this.radius < 0;
  }

  // consider a hit when arrow lands inside the visible target center region
  isHit(px, py) {
    //return dist(px, py, this.x, this.y) <= this.radius * 0.66;
    return this.hit;
  }

  markHit() {
    if (this.hit) return; // already marked as hit
    this.hit = true;
    hits += 1;
  }

  isCloseToMiddle() {
    return this.closeToMiddle;
  }

  markCloseToMiddle() {
    console.log("marking close to middle");
    this.closeToMiddle = true;
  }
  notCloseToMiddle() {
    this.closeToMiddle = false;
  }
}
