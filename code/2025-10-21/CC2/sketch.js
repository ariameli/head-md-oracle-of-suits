"use strict";

let values = [];

function setup() {
  // WEBGL allows us to render things in 3D mode
  createCanvas(windowWidth, windowHeight, WEBGL);
  angleMode(DEGREES);
}

function draw() {
  background(220);
  let x = map(mouseX, 0, width, 0, 360);
  // rotateZ(x);
  // rotateY(x);
  // rotateX(x);
  fill(255, 0, 0);
  box(50);

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      fill(255);
      push();
      translate(size, size);
      box(size);
      pop();
    }
  }
}
