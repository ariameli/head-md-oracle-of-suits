import { initHands, setupVideo } from "../../lib/mediapipe/hands.js";
import { GestureClassifier } from "./Gesture.js";
import { Target } from "./Target.js";
import { createTeachScene } from "./teach.js";

const MAX_HITS = 5;
window.hits = 0;
let detections = null;
let videoElement;
let selfieMode = true;
let gesture;
let firstFrame = false;
let arrow,
  arrowThrown,
  crossbowEmpty,
  crossbowTopView,
  crossbowWithArrow,
  currentCrossbowImage,
  startofGameVideo,
  endOfGameVideo,
  arrowThrownSound;
let font;
let targets = [];
let phrase =
  "Ouvre ta main au milieu de la cible pour tirer.\n Serre le poing pour tenir une nouvelle flèche.";
let isIntroPlaying = true;
let teachScene = null;
let teachActive = false;
let isEndPlaying = false;

function preload() {
  // Use existing asset locations (original folder) via absolute paths
  arrowThrownSound = loadSound("../../../public/audio/arrow-thrown.wav");
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
  startofGameVideo = createVideo(
    ["../../../public/videos/crossbow-intro.mp4"],
    () => {
      startofGameVideo.hide();
    }
  );
  endOfGameVideo = createVideo(
    ["../../../public/videos/crossbow-ending.mp4"],
    () => {
      endOfGameVideo.hide();
    }
  );
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
  // Create teach scene instance with the assets and font
  teachScene = createTeachScene({
    crossbowTopView,
    crossbowWithArrow,
    crossbowEmpty,
    arrow,
    arrowThrown,
    font,
    onComplete: () => {
      teachActive = false;
      // After the teach scene completes, start the actual game
      firstFrame = false;
      // user just held a fist to load the arrow — start game with arrow loaded
      currentCrossbowImage = crossbowWithArrow;
    },
  });
  if (startofGameVideo) {
    startofGameVideo.play();
    startofGameVideo.elt.onended = () => {
      isIntroPlaying = false;
      firstFrame = true;
      startofGameVideo.pause();
      startofGameVideo.elt.currentTime = 0;
      startofGameVideo.hide();
    };
  } else {
    isIntroPlaying = false;
    firstFrame = true;
  }
}

function onHandsResults(results) {
  detections = results;
}
function getHands() {
  return window.hands;
}

function draw() {
  background(0);
  if (isIntroPlaying && startofGameVideo) {
    imageMode(CENTER);
    const vw =
      startofGameVideo.width || startofGameVideo.elt.videoWidth || width;
    const vh =
      startofGameVideo.height || startofGameVideo.elt.videoHeight || height;
    const scale = Math.min(width / vw, height / vh);
    image(startofGameVideo, width / 2, height / 2, vw * scale, vh * scale);
    return;
  }
  imageMode(CENTER);
  if (teachActive) {
    teachScene.draw(detections);
    return;
  }

  // If end-of-game video is playing, render it full-screen and skip game draws
  if (isEndPlaying && endOfGameVideo) {
    imageMode(CENTER);
    const vw = endOfGameVideo.width || endOfGameVideo.elt.videoWidth || width;
    const vh =
      endOfGameVideo.height || endOfGameVideo.elt.videoHeight || height;
    const scale = Math.min(width / vw, height / vh);
    image(endOfGameVideo, width / 2, height / 2, vw * scale, vh * scale);
    return;
  }

  if (firstFrame) {
    push();
    fill(255);
    textFont(font);
    textAlign(LEFT, CENTER);
    textSize(42);
    text(
      "Serre le poing pour\ntenir l'arbalète dans ta main.",
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
      targets.push(new Target(width, windowHeight - 350, 120, 6));
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
  // Trigger end-of-game when enough hits are reached
  if (window.hits >= MAX_HITS && !isEndPlaying) {
    isEndPlaying = true;
    if (endOfGameVideo) {
      endOfGameVideo.elt.currentTime = 0;
      endOfGameVideo.play();
      endOfGameVideo.elt.onended = () => {
        // Set flag so launcher skips intro and goes straight to scan.
        try {
          window.sessionStorage.setItem("skipIntro", "1");
        } catch (e) {
          // non-fatal
        }
        window.location.href = "/src/launcher/index.html";
      };
    } else {
      // fallback: just reset
      isEndPlaying = false;
      window.hits = 0;
      targets = [];
      firstFrame = true;
      currentCrossbowImage = crossbowWithArrow;
    }
  }
  if (detections?.multiHandLandmarks) {
    for (const landmarks of detections.multiHandLandmarks) {
      const label = gesture.classify(landmarks);
      if (firstFrame) {
        // When on the initial instruction, entering a fist should open the teach scene
        if (label === "closed" && !teachActive) {
          teachActive = true;
          teachScene.start();
        }
      } else {
        if (label === "closed") {
          currentCrossbowImage = crossbowWithArrow;
        } else if (label === "open") {
          currentCrossbowImage = crossbowEmpty;
        }
      }
      targets.forEach((t) => {
        if (t.x < width / 2 + 5 && t.x > width / 2 - 5 && label === "open") {
          t.markHit();
          arrowThrownSound.play();
        }
      });
    }
  }
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
