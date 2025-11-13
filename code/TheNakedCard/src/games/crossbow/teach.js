import { GestureClassifier } from "./Gesture.js";
import { Target } from "./Target.js";

// Teach scene: two-step instruction
// Usage: const scene = createTeachScene({images..., font}); scene.start(); in draw: scene.draw(detections); check scene.done to proceed

export function createTeachScene({
  crossbowTopView,
  crossbowWithArrow,
  crossbowEmpty,
  arrow,
  arrowThrown,
  font,
  onComplete,
} = {}) {
  let target;
  let step = 0; // 0 = prompt open(release), 1 = release display, 2 = prompt fist to load arrow, 3 = put-arrow display
  let done = false;
  const gesture = new GestureClassifier();
  let stableCount = 0;
  const REQUIRED_STABLE = 6;
  let stepStart = 0;
  const RELEASE_DISPLAY_MS = 800; // show release state briefly
  const PUT_ARROW_MS = 400; // brief put-arrow display before completing

  function start() {
    step = 0;
    done = false;
    stableCount = 0;
  }

  function _drawMakeFist() {
    // instruction text + still target + crossbow with arrow
    push();
    fill(255);
    textFont(font);
    textAlign(CENTER, CENTER);
    textSize(42);
    text("Ouvre ta main pour tirer sur la cible.", width / 2, 100);
    pop();

    // show top view target and crossbow
    // if (crossbowTopView) {
    //   imageMode(CENTER);
    //   image(
    //     crossbowTopView,
    //     width / 2 + width / 4,
    //     height / 2,
    //     400,
    //     400
    //   );
    // }
    if (crossbowWithArrow) {
      imageMode(CENTER);
      target = new Target(width / 2, height / 2, 120, 0);
      target.draw();
      const aspect = 1306 / 397;
      const nw = windowWidth * 1.1;
      const nh = nw / aspect;
      image(crossbowWithArrow, windowWidth / 2, windowHeight - 100, nw, nh);
    }
  }

  function _drawRelease() {
    // instruction text + crossbow releasing arrow animation

    // show a target and arrow thrown sprite
    if (arrowThrown) {
      imageMode(CENTER);
      target = new Target(width / 2, height / 2, 120, 0);
      target.draw();
      image(arrowThrown, width / 2, height / 2, 100, 100);
    }
    if (crossbowEmpty) {
      imageMode(CENTER);
      const aspect = 1284 / 348;
      const nw = windowWidth;
      const nh = nw / aspect;
      image(crossbowEmpty, windowWidth / 2, windowHeight - 80, nw, nh);
    }
  }

  function draw(detections) {
    if (done) return;
    background(0);
    if (step === 0) {
      _drawMakeFist();
    } else if (step === 1) {
      _drawRelease();
    } else if (step === 2) {
      // prompt to make a fist to load arrow and start the game
      push();
      fill(255);
      textFont(font);
      textAlign(CENTER, CENTER);
      textSize(42);
      text(
        "Bien joué ! Serre le poing pour recharger ton arc et commencer le jeu.",
        width / 2,
        100
      );
      pop();
      // show empty crossbow waiting
      if (crossbowEmpty) {
        imageMode(CENTER);
        target = new Target(width / 2, height / 2, 120, 0);
        target.draw();
        image(arrowThrown, width / 2, height / 2, 100, 100);
        const aspect = 1284 / 348;
        const nw = windowWidth;
        const nh = nw / aspect;
        image(crossbowEmpty, windowWidth / 2, windowHeight - 80, nw, nh);
      }
    }
    // else if (step === 3) {
    //   // put-arrow animation: show crossbow with arrow briefly
    //   if (crossbowWithArrow) {
    //     imageMode(CENTER);
    //     image(
    //       crossbowWithArrow,
    //       width / 2,
    //       height - 100,
    //       width * 0.9,
    //       width * 0.9 * (397 / 1306)
    //     );
    //   }
    // }

    // Gesture detection from landmarks
    if (detections?.multiHandLandmarks) {
      for (const landmarks of detections.multiHandLandmarks) {
        const label = gesture.classify(landmarks);
        // For this teach scene we want:
        // step0 -> wait for OPEN to trigger release display (step1)
        // step1 -> after RELEASE_DISPLAY_MS move to step2 (prompt fist)
        // step2 -> wait for CLOSED to trigger put-arrow display (step3)
        // step3 -> after PUT_ARROW_MS finish and call onComplete
        if (step === 0 && label === "open") {
          stableCount++;
          if (stableCount >= REQUIRED_STABLE) {
            step = 1;
            stepStart = Date.now();
            stableCount = 0;
          }
        } else if (step === 1) {
          if (stepStart && Date.now() - stepStart >= RELEASE_DISPLAY_MS) {
            step = 2;
            stepStart = 0;
            stableCount = 0;
          }
        } else if (step === 2 && label === "closed") {
          stableCount++;
          if (stableCount >= REQUIRED_STABLE) {
            // start put-arrow display
            step = 3;
            stepStart = Date.now();
            stableCount = 0;
          }
        } else if (step === 3) {
          onComplete?.();
        } else {
          stableCount = 0;
        }
      }
    } else {
      // no hands => reset stability
      stableCount = 0;
    }
  }

  return {
    start,
    draw,
    get done() {
      return done;
    },
  };
}
