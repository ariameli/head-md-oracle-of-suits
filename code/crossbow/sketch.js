import { GestureClassifier } from "./class/Gesture.js";
import "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
import "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";

let videoElement;
let hands;
let detections = null;
let cam;
let selfieMode = true;
let showVideo = false;
let gesture; // <- new
let arrowBig;
let arrowThrown;
let crossbowEmpty;
let crossbowTopView;
let crossbowWithArrow;

function preload() {
  // preload assets here
  arrowBig = loadImage("/crossbow/images/arrow-big.png");
  arrowThrown = loadImage("/crossbow/images/arrow-thrown.png");
  crossbowEmpty = loadImage("/crossbow/images/crossbow-empty.png");
  crossbowTopView = loadImage("/crossbow/images/crossbow-top-view.png");
  crossbowWithArrow = loadImage("/crossbow/images/crossbow-with-arrow.png");
}

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
}

function onHandsResults(results) {
  detections = results;
}

function draw() {
  background(0);

  if (showVideo && videoElement && videoElement.loadedmetadata) {
    image(videoElement, 0, 0, width, height);
  } else {
    // faded background when video is off
    fill(30);
    rect(0, 0, width, height);
  }

  image(crossbowTopView, 0, 0, width, height);

  // draw landmarks and gesture labels
  if (detections && detections.multiHandLandmarks) {
    for (let i = 0; i < detections.multiHandLandmarks.length; i++) {
      const landmarks = detections.multiHandLandmarks[i];

      // use class methods
      gesture.drawHands(landmarks);
      const label = gesture.classify(landmarks);
      gesture.drawLabel(label, landmarks);
    }
  }
}

window.setup = setup;
window.draw = draw;
