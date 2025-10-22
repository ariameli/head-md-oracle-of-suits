"use strict";

// Matter.js
const { Engine, Body, Bodies, Composite, Composites, Constraint, Vector } =
  Matter;
let engine;
let bridge;
let num = 10;
let radius = 10;
let length = 25;
let circles = [];

let colorPalette = [
  "#abcd5e",
  "#14976b",
  "#2b67af",
  "#62b6de",
  "#f589a3",
  "#ef562f",
  "#fc8405",
  "#f9d531",
];

let distMouse = 30;
let capture;
let cols;
let rows;
let size = 10;
let offset = 4;
let blocks = [];
let drawing = [];
let prevPointer = { x: null, y: null };
let currPointer = { x: null, y: null }; // added current pointer for index finger

function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);
  // initialize MediaPipe settings
  setupHands();
  // start camera using MediaPipeHands.js helper
  setupVideo();

  engine = Engine.create();
  bridge = new Bridge(num, radius, length);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // clear the canvas
  background(255);
  Engine.update(engine);
  strokeWeight(2);
  stroke(0);

  //image(capture, 0, 0, 120, 100);

  // if the video connection is ready
  if (isVideoReady()) {
    // draw the capture image
    image(videoElement, 0, 0);
  }

  if (random() < 0.1) {
    circles.push(new Circle());
  }

  for (let i = circles.length - 1; i >= 0; i--) {
    circles[i].checkDone();
    circles[i].display();

    if (circles[i].done) {
      circles[i].removeCircle();
      circles.splice(i, 1);
    }
  }

  // make sure we have detections to draw
  if (detections) {
    // for each detected hand
    for (let hand of detections.multiHandLandmarks) {
      // draw the index finger
      drawIndex(hand);
      // draw the thumb finger
      drawThumb(hand);
      // draw fingertip points
      //drawTips(hand);
      // draw connections
      //drawConnections(hand);
      // draw all landmarks
      //drawLandmarks(hand);
      let thumb = hand[FINGER_TIPS.thumb];
      let index = hand[FINGER_TIPS.index];
      fill(0, 255, 0);
      noStroke();
      circle(thumb.x * videoElement.width, thumb.y * videoElement.height, 10);
      circle(index.x * videoElement.width, index.y * videoElement.height, 10);

      bridge.bodies[0].position.x = thumb.x * videoElement.width;
      bridge.bodies[0].position.y = thumb.y * videoElement.height;
      bridge.bodies[bridge.bodies.length - 1].position.x =
        index.x * videoElement.width;
      bridge.bodies[bridge.bodies.length - 1].position.y =
        index.y * videoElement.height;
      bridge.display();
    } // end of hands loop
  }
} // end of draw

// only the index finger tip landmark
function drawIndex(landmarks) {
  // get the index fingertip landmark
  let mark = landmarks[FINGER_TIPS.index];

  noStroke();
  // set fill color for index fingertip
  fill(0, 255, 255);

  // adapt the coordinates (0..1) to video coordinates
  let x = mark.x * videoElement.width;
  let y = mark.y * videoElement.height;
  circle(x, y, 20);

  // update current pointer with index finger coordinates
  currPointer.x = x;
  currPointer.y = y;

  // if previous pointer is not set, initializes it
  if (prevPointer.x === null && prevPointer.y === null) {
    prevPointer.x = x;
    prevPointer.y = y;
    return;
  }

  // stores the drawing points
  drawing.push([prevPointer.x, prevPointer.y, x, y]);

  // updates previous pointer coordinates
  prevPointer.x = x;
  prevPointer.y = y;
}

// draw the thumb finger tip landmark
function drawThumb(landmarks) {
  // get the thumb fingertip landmark
  let mark = landmarks[FINGER_TIPS.thumb];

  noStroke();
  // set fill color for thumb fingertip
  fill(255, 255, 0);

  // adapt the coordinates (0..1) to video coordinates
  let x = mark.x * videoElement.width;
  let y = mark.y * videoElement.height;
  circle(x, y, 20);
}

function drawTips(landmarks) {
  noStroke();
  // set fill color for fingertips
  fill(0, 0, 255);

  // fingertip indices
  const tips = [4, 8, 12, 16, 20];

  for (let tipIndex of tips) {
    let mark = landmarks[tipIndex];
    // adapt the coordinates (0..1) to video coordinates
    let x = mark.x * videoElement.width;
    let y = mark.y * videoElement.height;
    circle(x, y, 10);
  }
}

function drawLandmarks(landmarks) {
  noStroke();
  // set fill color for landmarks
  fill(255, 0, 0);

  for (let mark of landmarks) {
    // adapt the coordinates (0..1) to video coordinates
    let x = mark.x * videoElement.width;
    let y = mark.y * videoElement.height;
    circle(x, y, 6);
  }
}

function drawConnections(landmarks) {
  // set stroke color for connections
  stroke(0, 255, 0);

  // iterate through each connection
  for (let connection of HAND_CONNECTIONS) {
    // get the two landmarks to connect
    const a = landmarks[connection[0]];
    const b = landmarks[connection[1]];
    // skip if either landmark is missing
    if (!a || !b) continue;
    // landmarks are normalized [0..1], (x,y) with origin top-left
    let ax = a.x * videoElement.width;
    let ay = a.y * videoElement.height;
    let bx = b.x * videoElement.width;
    let by = b.y * videoElement.height;
    line(ax, ay, bx, by);
  }
}
