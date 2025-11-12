//import { GestureClassifier } from "./class/Gesture.js";
const MAX_HITS = 5;
let hits = 0;

let videoElement;
let hands;
let detections = null;
let cam;
let selfieMode = true;
let showVideo = false;
let gesture;

let firstFrame = true;

let arrow;
let arrowThrown;
let crossbowEmpty;
let crossbowTopView;
let crossbowWithArrow;
let currentCrossbowImage;

let font;

let targets = [];

let phrase =
  "Open your hand when in the middle of the target to release the arrow.\n Make a fist to hold a new arrow.";

function preload() {
  // Load any assets here if needed
  // use relative (folder-local) paths so files resolve when serving the project
  arrow = loadImage("images/arrow-big.png");
  arrowThrown = loadImage("images/arrow-thrown.png");
  crossbowEmpty = loadImage("images/crossbow-empty.png");
  crossbowTopView = loadImage("images/crossbow-top-view.png");
  crossbowWithArrow = loadImage("images/crossbow-with-arrow.png");

  font = loadFont("fonts/G2 TGR Medium/G2TGR-Medium.ttf");
}
function setup() {
  createCanvas(windowWidth, windowHeight);

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

  // if (hits >= MAX_HITS) {
  //   push();
  //   fill(255);
  //   textFont(font);
  //   textAlign(CENTER, CENTER);
  //   textSize(42);
  //   text(
  //     "Well done!\nYou have hit " + hits + " targets.",
  //     windowWidth / 2,
  //     windowHeight / 2
  //   );
  //   pop();
  //   return; // stop the draw loop here
  // }
  if (!firstFrame) {
    push();
    fill(255);
    textFont(font);
    textAlign(CENTER, CENTER);
    textSize(32);
    text(`${phrase}`, windowWidth / 2, 80);
    pop();
    //add moving targets here
    // keep targets on same horizontal line, spaced further apart
    let spacing = 200;
    if (targets.length > 0) {
      spacing = (width - targets[targets.length - 1].x) / 2;
    }

    if (spacing > 180) {
      const target = new Target(width, windowHeight - 350, 120, 3);
      targets.push(target);
    }

    for (const t of targets) {
      t.update();
      t.draw();
    }

    targets = targets.filter((t) => !t.isOffscreen());

    // if currentCrossbowImage is crossbowWithArrow, show that image
    if (currentCrossbowImage === crossbowWithArrow) {
      // make the image width the same as the window width but keep the same ratio of image
      let aspectRatio = 1306 / 397;
      let newWidth = windowWidth * 1.1;
      let newHeight = newWidth / aspectRatio;
      image(
        currentCrossbowImage,
        windowWidth / 2,
        windowHeight - 100,
        newWidth,
        newHeight
      );
    } else {
      // else show crossbowEmpty
      let aspectRatio = 1284 / 348;
      let newWidth = windowWidth;
      let newHeight = newWidth / aspectRatio;
      image(
        currentCrossbowImage,
        windowWidth / 2,
        windowHeight - 80,
        newWidth,
        newHeight
      );
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
    text(`${hits}/${MAX_HITS}`, windowWidth / 2, 160);
    pop();
  }

  // draw landmarks and gesture labels
  if (detections && detections.multiHandLandmarks) {
    for (let i = 0; i < detections.multiHandLandmarks.length; i++) {
      const landmarks = detections.multiHandLandmarks[i];

      // use class methods
      //gesture.drawHands(landmarks);
      const label = gesture.classify(landmarks);
      //gesture.drawLabel(label, landmarks);

      if (label === "closed") {
        firstFrame = false;
        currentCrossbowImage = crossbowWithArrow;
      } else if (label === "open") {
        currentCrossbowImage = crossbowEmpty;
      }
      targets.forEach((t) => {
        if (t.x < width / 2 + 5 && t.x > width / 2 - 5 && label === "open") {
          //console.log("arrow released");
          t.markHit();
        }
      });
    }
  }
}
