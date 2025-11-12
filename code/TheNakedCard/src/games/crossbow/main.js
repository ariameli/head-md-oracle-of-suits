import { initHands, setupVideo } from "../../lib/mediapipe/hands.js";
import { GestureClassifier } from "./Gesture.js";
import { Target } from "./Target.js";

const MAX_HITS = 5;
window.hits = 0;
let detections = null;
let videoElement;
let selfieMode = true;
let gesture;
let firstFrame = true;
let arrow,
  arrowThrown,
  crossbowEmpty,
  crossbowTopView,
  crossbowWithArrow,
  currentCrossbowImage;
let font;
let targets = [];
let phrase =
  "Open your hand when in the middle of the target to release the arrow.\n Make a fist to hold a new arrow.";

function preload() {
  // Use existing asset locations (original folder) via absolute paths
  arrow = loadImage("../../../public/images/crossbow/arrow-big.png");
  arrowThrown = loadImage("../../../public/images/crossbow/arrow-thrown.png");
  crossbowEmpty = loadImage(
    "../../../public/images/crossbow/crossbow-empty.png"
  );
  crossbowTopView = loadImage(
    "../../../public/images/crossbow/crossbow-top-view.png"
  );
  crossbowWithArrow = loadImage(
    "../../../public/images/crossbow/crossbow-with-arrow.png"
  );
  font = loadFont("../../../public/fonts/G2 TGR Medium/G2TGR-Medium.ttf");
  window.arrowThrown = arrowThrown;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  initHands({ maxNumHands: 2, selfieMode }, onHandsResults);
  const { videoElement: vid } = setupVideo(true, async (el) => {
    await getHands().send({ image: el });
  });
  videoElement = vid;
  videoElement.size(windowWidth, windowHeight);
  videoElement.hide();
  gesture = new GestureClassifier();
}

function onHandsResults(results) {
  detections = results;
}
function getHands() {
  return window.hands;
}

function draw() {
  background(0);
  imageMode(CENTER);
  if (firstFrame) {
    push();
    fill(255);
    textFont(font);
    textAlign(LEFT, CENTER);
    textSize(42);
    text(
      "Make a fist to hold\nthe crossbow in your hand.",
      150,
      windowHeight / 2
    );
    pop();
    image(
      crossbowTopView,
      windowWidth / 2 + windowWidth / 4,
      windowHeight / 2,
      400,
      400
    );
    currentCrossbowImage = crossbowWithArrow;
  }
  if (!firstFrame) {
    push();
    fill(255);
    textFont(font);
    textAlign(CENTER, CENTER);
    textSize(32);
    text(phrase, windowWidth / 2, 80);
    pop();
    let spacing =
      targets.length > 0 ? (width - targets[targets.length - 1].x) / 2 : 200;
    if (spacing > 180) {
      targets.push(new Target(width, windowHeight - 350, 120, 3));
    }
    for (const t of targets) {
      t.update();
      t.draw();
    }
    targets = targets.filter((t) => !t.isOffscreen());
    if (currentCrossbowImage === crossbowWithArrow) {
      const aspect = 1306 / 397;
      const nw = windowWidth * 1.1;
      const nh = nw / aspect;
      image(currentCrossbowImage, windowWidth / 2, windowHeight - 100, nw, nh);
    } else {
      const aspect = 1284 / 348;
      const nw = windowWidth;
      const nh = nw / aspect;
      image(currentCrossbowImage, windowWidth / 2, windowHeight - 80, nw, nh);
    }
    push();
    rectMode(CENTER);
    fill("#740808");
    rect(windowWidth / 2, 165, 200, 50, 20);
    pop();
    push();
    fill(255);
    textFont(font);
    textAlign(CENTER, CENTER);
    textSize(32);
    text(`${window.hits}/${MAX_HITS}`, windowWidth / 2, 160);
    pop();
  }
  if (detections?.multiHandLandmarks) {
    for (const landmarks of detections.multiHandLandmarks) {
      const label = gesture.classify(landmarks);
      if (label === "closed") {
        firstFrame = false;
        currentCrossbowImage = crossbowWithArrow;
      } else if (label === "open") {
        currentCrossbowImage = crossbowEmpty;
      }
      targets.forEach((t) => {
        if (t.x < width / 2 + 5 && t.x > width / 2 - 5 && label === "open") {
          t.markHit();
        }
      });
    }
  }
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
