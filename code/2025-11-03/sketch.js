import { GestureClassifier } from "./class/Gesture.js";
import { Target } from "./class/Target.js";
import { Arrow } from "./class/Arrow.js";
import "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
import "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";

let videoElement;
let hands;
let detections = null;
let cam;
let selfieMode = true;
let showVideo = false;
let gesture; // <- new

// new objects
let target;
let arrow;
let score = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // hidden video capture used by MediaPipe Camera util
  videoElement = createCapture(VIDEO, { flipped: selfieMode });
  videoElement.size(640, 480);
  videoElement.hide();

  // Initialize MediaPipe Hands
  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    },
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
    selfieMode: selfieMode,
  });

  hands.onResults(onHandsResults);

  // feed frames from the p5 video element to MediaPipe
  cam = new Camera(videoElement.elt, {
    onFrame: async () => {
      await hands.send({ image: videoElement.elt });
    },
    width: 640,
    height: 480,
  });

  cam.start();

  // instantiate classifier (ensure gesture.js is loaded before sketch.js)
  gesture = new GestureClassifier();

  // instantiate game objects
  target = new Target(width / 2, height / 2, min(width, height) * 0.18, 6);
  arrow = new Arrow();
}

function onHandsResults(results) {
  detections = results;
}

function draw() {
  background(30);

  if (showVideo && videoElement && videoElement.loadedmetadata) {
    image(videoElement, 0, 0, width, height);
  } else {
    // faded background when video is off
    fill(20);
    rect(0, 0, width, height);
  }

  // draw target
  target.draw();

  // update/draw arrow
  arrow.update();
  arrow.draw();

  // draw landmarks and gesture labels and handle interaction
  if (detections && detections.multiHandLandmarks) {
    // use the first detected hand for interaction
    const landmarks = detections.multiHandLandmarks[0];

    // draw visuals for hands
    gesture.drawHands(landmarks);
    const label = gesture.classify(landmarks);
    gesture.drawLabel(label, landmarks);

    // choose the anchor point to be the middle of the hand of the user
    const idxTip = landmarks[0];
    const aimX = idxTip.x * width;
    const aimY = idxTip.y * height;

    // if closed -> hold/follow the hand (bow manipulation)
    if (label === "closed") {
      arrow.hold(aimX, aimY);
    }

    // if open and arrow was held -> launch toward target
    if (label === "open" && arrow.state === "held") {
      arrow.launch(target.x, target.y);
    }
  }

  // check hit after updating arrow position
  if (arrow.checkHit(target)) {
    score += 1;
  }

  // HUD
  push();
  fill(255);
  textSize(20);
  textAlign(LEFT, TOP);
  text(`Score: ${score}`, 16, 16);
  textSize(14);
  text("Make a fist to hold the arrow, open to shoot.", 16, 42);
  pop();
}

window.setup = setup;
window.draw = draw;
