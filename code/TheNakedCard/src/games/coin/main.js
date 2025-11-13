import {
  initHands,
  setupVideo,
  FINGER_TIPS,
  HAND_CONNECTIONS,
} from "../../lib/mediapipe/hands.js";

// Slot Machine variables
const iconMap = [
  "../../../public/images/coin/1.png",
  "../../../public/images/coin/2.png",
  "../../../public/images/coin/3.png",
  "../../../public/images/coin/4.png",
  "../../../public/images/coin/5.png",
  "../../../public/images/coin/6.png",
  "../../../public/images/coin/7.png",
  "../../../public/images/coin/8.png",
];
const iconWidth = 79;
const iconHeight = 79;
const numIcons = 8;
const timePerIcon = 100;

let slotReels = [];
let indexes = [0, 0, 0];
let isRolling = false;
let winState = null;
let winTimer = 0;
let iconImages = [];
let imagesLoaded = false;

// Hand gesture control
let previousHandY = null;
let handGestureActive = false;
let gestureThreshold = 50;
let canTrigger = true;

// Win probability system - 2 to 6 attempts to win
let attemptCount = 0;
let minAttempts = 2;
let maxAttempts = 6;
let targetAttempt = null;

// Confetti system
let confetti = [];

// Tutorial flag
let showTutorial = true;

// MediaPipe detections
let detections = null;
let videoElement;

function preload() {
  for (let i = 0; i < numIcons; i++) {
    iconImages[i] = loadImage(iconMap[i]);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  initHands({ maxNumHands: 1, selfieMode: true }, onHandsResults);
  const { videoElement: vid } = setupVideo(true, async (el) => {
    await getHands().send({ image: el });
  });
  videoElement = vid;
  // Hide video, we only use detections
  try {
    videoElement.hide();
  } catch (e) {}

  for (let i = 0; i < 3; i++) {
    slotReels.push({
      position: 0,
      targetPosition: 0,
      velocity: 0,
      isAnimating: false,
      offset: i,
    });
  }

  imagesLoaded = iconImages.every((img) => img && img.width > 0);
  targetAttempt = floor(random(minAttempts, maxAttempts + 1));

  // Hide tutorial after 8 seconds
  setTimeout(() => {
    showTutorial = false;
  }, 8000);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);

  // Draw machine
  drawSlotMachine();

  // Confetti
  updateConfetti();
  drawConfetti();

  // Gestures and reels
  checkHandGestures();
  updateReels();

  // Optional: draw landmarks for debug
  strokeWeight(2);
  if (detections?.multiHandLandmarks) {
    for (let hand of detections.multiHandLandmarks) {
      drawConnections(hand);
      drawLandmarks(hand);
      drawTips(hand);
      drawIndex(hand);
      drawThumb(hand);
    }
  }

  if (showTutorial) {
    drawTutorial();
  }
}

function drawTutorial() {
  push();
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const arrowY = centerY - 20 + 80 + sin(frameCount * 0.1) * 10;
  drawArrowDown(centerX, arrowY);
  fill(255);
  textSize(35);
  textAlign(CENTER, CENTER);
  text("Descendez votre main", centerX, centerY + 120);
  text("pour faire tourner la machine", centerX, centerY + 170);
  pop();
}

function drawArrowDown(x, y) {
  push();
  const pulse = sin(frameCount * 0.15) * 5;
  stroke(0, 255, 0);
  strokeWeight(8);
  line(x, y, x, y + 80 + pulse);
  fill(0, 255, 0);
  noStroke();
  triangle(x, y + 90 + pulse, x - 25, y + 60 + pulse, x + 25, y + 60 + pulse);
  fill(0, 255, 0, 100);
  ellipse(x, y + 75 + pulse, 60, 60);
  pop();
}

function createConfetti() {
  for (let i = 0; i < 150; i++) {
    confetti.push({
      x: random(width),
      y: random(-height, 0),
      vx: random(-2, 2),
      vy: random(2, 5),
      rotation: random(TWO_PI),
      rotationSpeed: random(-0.2, 0.2),
      size: random(8, 15),
      color: color(random(255), random(255), random(255)),
      gravity: random(0.1, 0.3),
      life: 255,
    });
  }
}

function updateConfetti() {
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.vy += c.gravity;
    c.x += c.vx;
    c.y += c.vy;
    c.rotation += c.rotationSpeed;
    c.life -= 1.5;
    if (c.y > height + 50 || c.life <= 0) confetti.splice(i, 1);
  }
}

function drawConfetti() {
  for (const c of confetti) {
    push();
    translate(c.x, c.y);
    rotate(c.rotation);
    const confettiColor = color(
      red(c.color),
      green(c.color),
      blue(c.color),
      c.life
    );
    fill(confettiColor);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, c.size, c.size * 0.6);
    pop();
  }
}

function checkHandGestures() {
  if (detections?.multiHandLandmarks?.length) {
    const hand = detections.multiHandLandmarks[0];
    const wrist = hand[0];
    const currentHandY = wrist.y * height;
    if (previousHandY !== null && canTrigger && !isRolling) {
      const deltaY = currentHandY - previousHandY;
      if (deltaY > gestureThreshold) {
        showTutorial = false;
        rollAll();
        canTrigger = false;
        setTimeout(() => {
          canTrigger = true;
          previousHandY = null;
        }, 2000);
      }
    }
    previousHandY = currentHandY;
    handGestureActive = true;
  } else {
    previousHandY = null;
    handGestureActive = false;
  }
}

function updateReels() {
  for (const reel of slotReels) {
    if (reel.isAnimating) {
      const distance = reel.targetPosition - reel.position;
      reel.velocity = distance * 0.15;
      reel.position += reel.velocity;
      if (abs(distance) < 0.5) {
        reel.position = reel.targetPosition;
        reel.velocity = 0;
        reel.isAnimating = false;
      }
    }
  }
  if (winState && frameCount % 20 === 0) {
    winTimer++;
    if (winTimer > 10) {
      winState = null;
      winTimer = 0;
    }
  }
}

function drawSlotMachine() {
  push();
  const centerX = width / 2;
  const centerY = height / 2;
  const scl = min(width / 400, height / 500);
  const reelWidth = iconWidth * scl;
  const reelHeight = 3 * iconHeight * scl;
  const spacing = 15 * scl;
  const totalWidth = 3 * reelWidth + 2 * spacing;
  const startX = centerX - totalWidth / 2;

  if (winState === "win2") fill(255, 200 + sin(frameCount * 0.3) * 55, 0);
  else if (winState === "win1")
    fill(173, 216 + sin(frameCount * 0.3) * 39, 230);
  else if (handGestureActive) fill(50, 200, 50);
  else fill(80);

  stroke(150);
  strokeWeight(5 * (scl / 2));
  const padding = 40 * scl;
  rect(
    startX - padding,
    centerY - reelHeight / 2 - padding,
    totalWidth + padding * 2,
    reelHeight + padding * 2,
    10
  );

  fill(0, 0, 0, 150);
  noStroke();
  rect(
    startX - padding,
    centerY - reelHeight / 2 - padding,
    totalWidth + padding * 2,
    15 * scl
  );

  for (let i = 0; i < 3; i++) {
    const x = startX + i * (reelWidth + spacing);
    drawReel(x, centerY - reelHeight / 2, reelWidth, reelHeight, i, scl);
  }
  pop();
}

function drawReel(x, y, w, h, index, scl) {
  push();
  fill(255);
  stroke(50);
  strokeWeight(3 * (scl / 2));
  rect(x, y, w, h, 5);
  noStroke();
  fill(0, 0, 0, 80);
  rect(x, y, w, h * 0.15);
  fill(0, 0, 0, 80);
  rect(x, y + h * 0.85, w, h * 0.15);

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(x + 4, y + 4, w - 8, h - 8);
  drawingContext.clip();

  const reel = slotReels[index];
  const currentIconPosition = reel.position / iconHeight;
  const baseIconIndex = floor(currentIconPosition);
  const offset = (currentIconPosition - baseIconIndex) * iconHeight;
  const iconScale = scl;
  const iconSpacing = iconHeight * iconScale;

  for (let i = -1; i <= 3; i++) {
    const iconIndex = (baseIconIndex + i + numIcons * 100) % numIcons;
    const yPos = y + h / 2 + i * iconSpacing - offset * iconScale;
    const distFromCenter = abs(yPos - (y + h / 2));
    const opacity = map(distFromCenter, 0, h / 2, 255, 50, true);
    if (
      imagesLoaded &&
      iconImages[iconIndex] &&
      iconImages[iconIndex].width > 0
    ) {
      push();
      imageMode(CENTER);
      tint(255, opacity);
      image(
        iconImages[iconIndex],
        x + w / 2,
        yPos,
        iconWidth * iconScale * 0.9,
        iconHeight * iconScale * 0.9
      );
      pop();
    }
  }

  drawingContext.restore();
  noFill();
  stroke(0, 0, 0, 60);
  strokeWeight(5 * (scl / 2));
  rect(x + 4, y + 4, w - 8, h - 8, 5);
  pop();
}

function determineRiggedOutcome(currentAttempt) {
  if (currentAttempt === targetAttempt) {
    const winningIcon = floor(random(numIcons));
    return [winningIcon, winningIcon, winningIcon];
  } else if (currentAttempt === targetAttempt - 1) {
    const winningIcon = floor(random(numIcons));
    let differentIcon = floor(random(numIcons));
    while (differentIcon === winningIcon)
      differentIcon = floor(random(numIcons));
    const differentPos = floor(random(3));
    const result = [winningIcon, winningIcon, winningIcon];
    result[differentPos] = differentIcon;
    return result;
  } else {
    let icon1 = floor(random(numIcons));
    let icon2 = floor(random(numIcons));
    let icon3 = floor(random(numIcons));
    while (icon2 === icon1) icon2 = floor(random(numIcons));
    while (icon3 === icon1 || icon3 === icon2) icon3 = floor(random(numIcons));
    return [icon1, icon2, icon3];
  }
}

function roll(reelIndex, offset = 0, targetIcon = null) {
  return new Promise((resolve) => {
    const reel = slotReels[reelIndex];
    let delta;
    if (targetIcon !== null) {
      const currentIcon = round(reel.position / iconHeight) % numIcons;
      const iconDiff = (targetIcon - currentIcon + numIcons) % numIcons;
      delta = (offset + 2) * numIcons + iconDiff;
    } else {
      delta = (offset + 2) * numIcons + floor(random(numIcons));
    }
    setTimeout(() => {
      reel.isAnimating = true;
      reel.targetPosition = reel.position + delta * iconHeight;
      setTimeout(() => {
        const finalIconIndex =
          round(reel.targetPosition / iconHeight) % numIcons;
        reel.position = finalIconIndex * iconHeight;
        reel.targetPosition = reel.position;
        resolve(finalIconIndex);
      }, (8 + delta) * timePerIcon + offset * 150);
    }, offset * 150);
  });
}

function rollAll() {
  if (isRolling) return;
  isRolling = true;
  winState = null;
  attemptCount++;
  const targetIcons = determineRiggedOutcome(attemptCount);
  Promise.all([
    roll(0, 0, targetIcons[0]),
    roll(1, 1, targetIcons[1]),
    roll(2, 2, targetIcons[2]),
  ]).then((deltas) => {
    deltas.forEach((delta, i) => (indexes[i] = delta));
    isRolling = false;
    if (indexes[0] === indexes[1] && indexes[1] === indexes[2]) {
      winState = "win2";
      winTimer = 0;
      createConfetti();
      setTimeout(() => {
        attemptCount = 0;
        targetAttempt = floor(random(minAttempts, maxAttempts + 1));
      }, 5000);
    } else if (
      indexes[0] === indexes[1] ||
      indexes[1] === indexes[2] ||
      indexes[0] === indexes[2]
    ) {
      winState = "win1";
      winTimer = 0;
    }
  });
}

function drawIndex(landmarks) {
  const m = landmarks[FINGER_TIPS.index];
  noStroke();
  fill(62, 119, 74);
  circle(m.x * width, m.y * height, 20);
}
function drawThumb(landmarks) {
  const m = landmarks[FINGER_TIPS.thumb];
  noStroke();
  fill(62, 119, 74);
  circle(m.x * width, m.y * height, 20);
}
function drawTips(landmarks) {
  noStroke();
  fill(62, 119, 74);
  for (const tipIndex of [4, 8, 12, 16, 20]) {
    const m = landmarks[tipIndex];
    circle(m.x * width, m.y * height, 10);
  }
}
function drawLandmarks(landmarks) {
  noStroke();
  fill(62, 119, 74);
  for (const m of landmarks) circle(m.x * width, m.y * height, 6);
}
function drawConnections(landmarks) {
  stroke(62, 119, 74);
  strokeWeight(2);
  for (const [aI, bI] of HAND_CONNECTIONS) {
    const a = landmarks[aI],
      b = landmarks[bI];
    if (!a || !b) continue;
    line(a.x * width, a.y * height, b.x * width, b.y * height);
    strokeWeight(12);
  }
}

function onHandsResults(results) {
  detections = results;
}
function getHands() {
  return window.hands;
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.windowResized = windowResized;
