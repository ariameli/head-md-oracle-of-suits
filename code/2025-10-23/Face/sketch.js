"use strict";
let mouthPucker = 0.0;
let letter;

let rings = [];
let numRing = 5;
let letters = [];

// the blendshapes we are going to track
function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);

  for (let i = 0; i < numRing; i++) {
    rings[i] = [];

    let r = 30 + i * 15;
    let circumference = 2 * Math.PI * r;
    let fontSize = 10 + i * 3;
    let num = floor(circumference / fontSize);
    for (let j = 0; j < num; j++) {
      let angle = (TWO_PI / num) * j;
      let x = width / 2 + r * cos(angle);
      let y = height / 2 + r * sin(angle);
      rings[i][j] = new Letter(x, y, fontSize);
    }
  }

  // initialize MediaPipe
  setupFace();
  setupVideo();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(220);
  if (isVideoReady()) {
    // show video frame
    tint(255, 127);
    image(videoElement, 0, 0);
  }
  // get detected faces
  let faces = getFaceLandmarks();

  // see blendshapes.txt for full list of possible blendshapes
  mouthPucker = getBlendshapeScore("mouthPucker");

  //draw a vertical green line from the center of the screen to create a stem
  stroke("green");
  strokeWeight(10);
  line(width / 2, height / 2, width / 2, height);

  for (let i = 0; i < rings.length; i++) {
    for (let j = 0; j < rings[i].length; j++) {
      if (mouthPucker > 0.3) {
        let mouth = createVector(width / 2, height / 2);
        trigger(rings[i][j], mouth);
      }

      rings[i][j].update();
      rings[i][j].display();
    }
  }
}

function trigger(letter, mouth) {
  let force = p5.Vector.sub(letter.position, mouth);
  let distance = force.mag();
  force.normalize();

  let magnitude = map(distance, 0, width, 0.1, 1) * random(0.1, 1);
  force.mult(magnitude);
  letter.applyForce(force);

  letter.angleV = map(distance, 0, width, 0.01, 0.1) * random(0.5, 2);
}
