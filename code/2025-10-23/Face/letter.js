class Letter {
  constructor(x, y, fontSize) {
    let alphabets = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ];
    this.letter = "*";
    //this.letter = "A";
    this.fontSize = fontSize;

    this.position = createVector(x, y);
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(0, 0);
    this.angle = 0;
    this.angleV = 0;
  }
  applyForce(force) {
    this.acceleration.add(force);
  }
  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
    this.angle += this.angleV;
  }

  display() {
    push();
    fill("purple");
    stroke("purple");
    strokeWeight(5);
    translate(this.position.x, this.position.y);
    rotate(this.angle);
    textSize(this.fontSize);
    textAlign(CENTER, CENTER);
    text(this.letter, 0, 0);
    pop();
  }
}
