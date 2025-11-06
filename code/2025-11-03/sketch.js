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
let gesture;

let targetList = [];
let spawnTimer = 0;
const spawnInterval = 3000; // larger spacing between targets
const TARGET_SPEED = 2.2;
const MAX_TARGETS = 4;

let targetHits = 0;
const TARGETS_TO_WIN = 3;

let targetActive = false; // spawn after user holds arrow
let arrow;
let gameWon = false;

let gameFont = null;

// UI images (PNG files in images/)
let imgCrossbowTop = null;
let imgCrossbowWithArrow = null;
let imgCrossbowEmpty = null;
let imgArrowThrown = null;

// screens: 'intro' (screen 1), 'playing' (screen 2), 'won'
let screen = "intro";

function preload() {
  // load font (try likely paths)
  const fontCandidates = [
    "fonts/G2 TGR Regular/G2TGR-Regular.ttf",
    "fonts/G2 TGR Regular/G2TGR-Regular.otf",
  ];
  for (let p of fontCandidates) {
    try {
      gameFont = loadFont(
        p,
        () => {},
        () => {}
      );
      if (gameFont) break;
    } catch (e) {}
  }

  // load PNG UI assets from images/ — use callbacks to avoid silent failures
  imgCrossbowTop = loadImage("images/crossbow-top-view.png");
  imgCrossbowWithArrow = loadImage("images/crossbow-with-arrow.png");
  imgCrossbowEmpty = loadImage("images/crossbow-empty.png");
  imgArrowThrown = loadImage("images/arrow-thrown.png");
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

  cam = new Camera(videoElement.elt, {
    onFrame: async () => {
      await hands.send({ image: videoElement.elt });
    },
    width: 640,
    height: 480,
  });

  cam.start();

  gesture = new GestureClassifier();

  arrow = new Arrow();
}

function onHandsResults(results) {
  detections = results;
}

function spawnTarget() {
  if (targetList.length >= MAX_TARGETS) return;
  // keep targets on same horizontal line, spaced further apart
  const r = random(90, 140); // bigger targets
  const y = height * 0.45; // fixed horizontal line
  const spacing = width * 0.35; // large spacing to right of screen
  const xStart = width + r + 20 + targetList.length * spacing;
  targetList.push(new Target(xStart, y, r, TARGET_SPEED));
}

function draw() {
  background(0); // black

  // Screen 1: Intro
  if (screen === "intro") {
    push();
    fill(255);
    if (gameFont) textFont(gameFont);
    textAlign(LEFT, CENTER);
    textSize(28);
    text(
      "Show a fist to the webcam to hold the crossbow in your hand.",
      40,
      height / 2
    );
    pop();

    // right: crossbow-top-view image (use PNG if loaded)
    if (imgCrossbowTop) {
      imageMode(CENTER);
      const scale = min(
        (width * 0.35) / imgCrossbowTop.width,
        (height * 0.6) / imgCrossbowTop.height
      );
      const wImg = imgCrossbowTop.width * scale;
      const hImg = imgCrossbowTop.height * scale;
      image(imgCrossbowTop, 0, 0, wImg, hImg);
    }

    // still listen for hand; if closed and hand detected, transition to playing and hold arrow
    if (
      detections &&
      detections.multiHandLandmarks &&
      detections.multiHandLandmarks.length > 0
    ) {
      const landmarks = detections.multiHandLandmarks[0];
      const label = gesture.classify(landmarks);
      if (label === "closed") {
        // anchor at index tip
        const anchor = landmarks[8];
        const ax = anchor.x * width;
        const ay = anchor.y * height;
        arrow.hold(ax, ay);
        targetActive = true;
        screen = "playing";
      }
      // draw hand feedback
      gesture.drawHands(landmarks);
      gesture.drawLabel(label, landmarks);
    }

    return;
  }

  // Screen 2: playing
  // update/spawn targets
  for (let i = targetList.length - 1; i >= 0; i--) {
    const t = targetList[i];
    t.update();
    t.draw();

    // if target has arrow placed via open-in-target, draw arrow-thrown at its center (PNG)
    if (t.hasArrow) {
      if (imgArrowThrown) {
        push();
        imageMode(CENTER);
        const aw = imgArrowThrown.width;
        const ah = imgArrowThrown.height;
        const s = ((t.radius * 1.0) / max(aw, ah)) * 2.0;
        image(imgArrowThrown, t.x, t.y, aw * s, ah * s);
        pop();
      } else {
        // fallback: small diamond marker
        push();
        fill(200, 60, 60);
        noStroke();
        translate(t.x, t.y);
        rotate(QUARTER_PI);
        rectMode(CENTER);
        rect(0, 0, t.radius * 0.6, t.radius * 0.6);
        pop();
      }
    }

    // remove target only if offscreen
    if (t.isOffscreen()) {
      targetList.splice(i, 1);
    }
  }

  // draw crossbow at bottom using PNGs if available
  imageMode(CENTER);
  if (arrow.state === "held") {
    if (imgCrossbowWithArrow) {
      const wImg = min(width * 0.6, imgCrossbowWithArrow.width * 0.6);
      const hImg =
        (imgCrossbowWithArrow.height / imgCrossbowWithArrow.width) * wImg;
      image(
        imgCrossbowWithArrow,
        width / 2,
        height - hImg / 2 - 10,
        wImg,
        hImg
      );
    }
  } else {
    if (imgCrossbowEmpty) {
      const wImg = min(width * 0.6, imgCrossbowEmpty.width * 0.6);
      const hImg = (imgCrossbowEmpty.height / imgCrossbowEmpty.width) * wImg;
      image(imgCrossbowEmpty, width / 2, height - hImg / 2 - 10, wImg, hImg);
    }
  }

  // update and draw arrow (if in flight)
  arrow.update();
  arrow.draw();

  // draw hand detection and manage interactions
  let handLabel = null;
  if (
    detections &&
    detections.multiHandLandmarks &&
    detections.multiHandLandmarks.length > 0
  ) {
    const landmarks = detections.multiHandLandmarks[0];
    gesture.drawHands(landmarks);
    handLabel = gesture.classify(landmarks);
    gesture.drawLabel(handLabel, landmarks);

    const anchor = landmarks[8];
    const ax = anchor.x * width;
    const ay = anchor.y * height;

    // hold behavior: fist picks arrow up
    if (
      handLabel === "closed" &&
      (arrow.state === "idle" || arrow.state === "held")
    ) {
      arrow.hold(ax, ay);
      targetActive = true;
      screen = "playing";
    }

    // if open while holding: either place arrow instantly into a target (if hand currently over one)
    if (handLabel === "open" && arrow.state === "held") {
      let placed = false;
      for (let t of targetList) {
        if (dist(ax, ay, t.x, t.y) <= t.radius) {
          t.hasArrow = true;
          if (!t.scored) {
            t.scored = true;
            targetHits += 1;
          }
          placed = true;
          break;
        }
      }
      if (!placed) {
        // normal launch toward nearest target or center
        let tx = width / 2;
        let ty = height / 2;
        if (targetList.length > 0) {
          tx = targetList[0].x;
          ty = targetList[0].y;
        }
        arrow.launch(tx, ty);
      } else {
        // reset arrow back to idle (crossbow becomes empty)
        arrow.reset();
      }
    }
  }

  // spawn logic
  if (targetActive && !gameWon) {
    spawnTimer += deltaTime;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnTarget();
    }
  }

  // collision checks for launched arrow: mark target.hit but do not remove
  if (arrow.state === "launched") {
    for (let t of targetList) {
      if (t.isHit(arrow.pos.x, arrow.pos.y)) {
        t.markHit();
        t.hasArrow = true;
        if (!t.scored) {
          t.scored = true;
          targetHits += 1;
        }
        arrow.reset();
        break;
      }
    }
    // reset if out of bounds
    if (
      arrow.pos.x < -50 ||
      arrow.pos.x > width + 50 ||
      arrow.pos.y < -50 ||
      arrow.pos.y > height + 50
    ) {
      arrow.reset();
    }
  }

  // win condition
  if (!gameWon && targetHits >= TARGETS_TO_WIN) {
    gameWon = true;
  }

  // HUD: score top center, bigger font white
  push();
  fill(255);
  if (gameFont) textFont(gameFont);
  textAlign(CENTER, TOP);
  textSize(36);
  text(`Hits: ${targetHits}/${TARGETS_TO_WIN}`, width / 2, 8);

  // instruction line under score
  textSize(18);
  if (arrow.state === "held") {
    text("Open hand to release bow / put arrow on target.", width / 2, 54);
  } else if (!targetActive) {
    text("Show a fist to catch the crossbow.", width / 2, 54);
  }

  if (gameWon) {
    textSize(44);
    textAlign(CENTER, CENTER);
    text("You win!", width / 2, height / 2 - 40);
    textSize(18);
    text("Restart the page to play again.", width / 2, height / 2 + 16);
  }

  pop();
}

window.setup = setup;
window.draw = draw;
