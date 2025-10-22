"use strict";

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
  capture = createCapture(VIDEO, { flipped: true });
  capture.size(100, 180);
  capture.hide();

  // initialize MediaPipe settings
  setupHands();
  // start camera using MediaPipeHands.js helper
  setupVideo();
  rectMode(CENTER);
  angleMode(DEGREES);
  //colorMode(HSB);
  cols = width / size;
  rows = height / size;

  for (let i = 0; i < cols; i++) {
    blocks[i] = [];
    for (let j = 0; j < rows; j++) {
      blocks[i][j] = new Block(size / 2 + i * size, size / 2 + j * size);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // clear the canvas
  background(255);
  // load current webcam pixels once per frame
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      blocks[i][j].display();
      blocks[i][j].move();
    }
  }

  image(capture, 0, 0, 120, 100);

  // if the video connection is ready
  if (isVideoReady()) {
    // draw the capture image
    //image(videoElement, 0, 0);
  }

  // use thicker lines for drawing hand connections
  strokeWeight(2);

  // make sure we have detections to draw
  if (detections) {
    // for each detected hand
    for (let hand of detections.multiHandLandmarks) {
      // draw the index finger
      drawIndex(hand);
      // draw the thumb finger
      //drawThumb(hand);
      // draw fingertip points
      //drawTips(hand);
      // draw connections
      //drawConnections(hand);
      // draw all landmarks
      //drawLandmarks(hand);
    } // end of hands loop
  } else {
    // no detections — clear current pointer so blocks won't react
    currPointer.x = null;
    currPointer.y = null;
    prevPointer.x = null;
    prevPointer.y = null;
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
