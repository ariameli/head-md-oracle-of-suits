import {
  initHands,
  setupVideo,
  FINGER_TIPS,
  HAND_CONNECTIONS,
} from "../../lib/mediapipe/hands.js";

let detections = null;
let videoElement;

let cards = [];
const NUMBER_OF_CARDS = 40;
const CARD_WIDTH = 100;
const CARD_HEIGHT = 150;
const TOUCH_DISTANCE = 30;
const FRICTION = 0.98;
const MOVEMENT_STRENGTH = 0.5;
const ROTATION_STRENGTH = 0.02;
const REPULSION_DISTANCE = 20;
const REPULSION_FORCE = 0.5;
const HOLD_TIME = 2300;
const GLOW_COLOR = [255, 215, 0];
const GLOW_SIZE = 200;

let cardImages = [];
const cardImageNames = [
  "2bastos.png",
  "4bastos.png",
  "5bastos.png",
  "6bastos.png",
  "7bastos.png",
  "8bastos.png",
  "Abastos.png",
  "Cbastos.png",
  "Rbastos.png",
  "Sbastos.png",
];
const card3ImageName = "3bastos.png";
let card3Image;

function preload() {
  for (let i = 0; i < cardImageNames.length; i++) {
    cardImages[i] = loadImage(`../../../public/card/${cardImageNames[i]}`);
  }
  card3Image = loadImage(`../../../public/card/${card3ImageName}`);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  initHands({ maxNumHands: 2, selfieMode: true }, onHandsResults);
  const { videoElement: vid } = setupVideo(true, async (el) => {
    await getHands().send({ image: el });
  });
  videoElement = vid;
  // Normalize video element sizing to match the canvas so landmark coordinates (0..1) scale to canvas width/height
  // This keeps interaction consistent even if the underlying capture has a different aspect ratio.
  try {
    if (videoElement?.size) {
      videoElement.size(windowWidth, windowHeight);
    } else {
      // Fallback for plain HTMLVideoElement returned by helper
      videoElement.width = windowWidth;
      videoElement.height = windowHeight;
      videoElement.style.objectFit = "cover";
    }
  } catch (e) {
    /* non-fatal */
  }

  // Create special card 3
  cards.push({
    x: width / 2 - CARD_WIDTH / 2,
    y: height / 2 - CARD_HEIGHT / 2,
    angle: random(TWO_PI),
    vx: 0,
    vy: 0,
    va: 0,
    isCard3: true,
    isGlowing: false,
    touchStartTime: 0,
    name: "Card3",
  });
  for (let i = 0; i < NUMBER_OF_CARDS - 1; i++) {
    cards.push({
      x: random(width - CARD_WIDTH),
      y: random(height - CARD_HEIGHT),
      angle: random(TWO_PI),
      vx: 0,
      vy: 0,
      va: 0,
      isCard3: false,
      imageIndex: floor(random(cardImageNames.length)),
      name: `Card ${i + 1}`,
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  try {
    if (videoElement?.size) {
      videoElement.size(windowWidth, windowHeight);
    } else if (videoElement) {
      videoElement.width = windowWidth;
      videoElement.height = windowHeight;
    }
  } catch (e) {
    /* non-fatal */
  }
}

function draw() {
  background(0);
  if (detections?.multiHandLandmarks) {
    for (let hand of detections.multiHandLandmarks) {
      drawIndex(hand);
      drawThumb(hand);
      drawTips(hand);
      drawConnections(hand);
      drawLandmarks(hand);
      let isTouchingCard3 = false;
      for (let tipIndex of [4, 8, 12, 16, 20]) {
        const mark = hand[tipIndex];
        // Use canvas dimensions (width/height) for mapping normalized landmark coordinates instead of raw video element
        const fingerX = mark.x * width;
        const fingerY = mark.y * height;
        for (let card of cards) {
          const cx = card.x + CARD_WIDTH / 2;
          const cy = card.y + CARD_HEIGHT / 2;
          if (distance(fingerX, fingerY, cx, cy) < TOUCH_DISTANCE) {
            const dx = fingerX - cx,
              dy = fingerY - cy;
            card.vx = dx * MOVEMENT_STRENGTH;
            card.vy = dy * MOVEMENT_STRENGTH;
            card.va = (Math.atan2(dy, dx) - card.angle) * ROTATION_STRENGTH;
            if (card.isCard3) isTouchingCard3 = true;
          }
        }
      }
      const card3 = cards.find((c) => c.isCard3);
      if (card3) {
        if (isTouchingCard3) {
          if (card3.touchStartTime === 0) {
            card3.touchStartTime = millis();
          }
          if (millis() - card3.touchStartTime >= HOLD_TIME) {
            card3.isGlowing = true;
          }
        } else {
          card3.touchStartTime = 0;
        }
      }
    }
  }
  drawCards();
}

function drawIndex(l) {
  const m = l[FINGER_TIPS.index];
  noStroke();
  fill(255);
  circle(m.x * width, m.y * height, 10);
}
function drawThumb(l) {
  const m = l[FINGER_TIPS.thumb];
  noStroke();
  fill(255);
  circle(m.x * width, m.y * height, 5);
}
function drawTips(l) {
  noStroke();
  fill(255);
  for (const i of [4, 8, 12, 16, 20]) {
    const m = l[i];
    circle(m.x * width, m.y * height, 0);
  }
}
function drawLandmarks(l) {
  noStroke();
  fill(255);
  for (const m of l) {
    circle(m.x * width, m.y * height, 0);
  }
}
function drawConnections(l) {
  stroke(255);
  strokeWeight(6);
  for (const [aI, bI] of HAND_CONNECTIONS) {
    const a = l[aI],
      b = l[bI];
    if (!a || !b) continue;
    line(a.x * width, a.y * height, b.x * width, b.y * height);
  }
}

function drawCards() {
  applyRepulsion();
  imageMode(CENTER);
  for (let card of cards) {
    card.x += card.vx;
    card.y += card.vy;
    card.angle += card.va * 0.5;
    card.vx *= FRICTION;
    card.vy *= FRICTION;
    card.va *= FRICTION;
    card.x = constrain(card.x, 0, width - CARD_WIDTH);
    card.y = constrain(card.y, 0, height - CARD_HEIGHT);
    if (card.x <= 0 || card.x >= width - CARD_WIDTH) card.vx *= -0.5;
    if (card.y <= 0 || card.y >= height - CARD_HEIGHT) card.vy *= -0.5;
    push();
    translate(card.x + CARD_WIDTH / 2, card.y + CARD_HEIGHT / 2);
    rotate(card.angle);
    if (card.isCard3) {
      if (card.isGlowing) {
        drawingContext.shadowBlur = GLOW_SIZE;
        drawingContext.shadowColor = `rgb(${GLOW_COLOR[0]}, ${GLOW_COLOR[1]}, ${GLOW_COLOR[2]})`;
      }
      if (card3Image && card3Image.width) {
        image(card3Image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
      } else {
        noStroke();
        fill(80);
        rectMode(CENTER);
        rect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8);
      }
      drawingContext.shadowBlur = 0;
    } else if (
      cardImages[card.imageIndex] &&
      cardImages[card.imageIndex].width
    ) {
      image(cardImages[card.imageIndex], 0, 0, CARD_WIDTH, CARD_HEIGHT);
    } else {
      noStroke();
      fill(60);
      rectMode(CENTER);
      rect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8);
    }
    pop();
  }
}

function applyRepulsion() {
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const c1 = cards[i],
        c2 = cards[j];
      const c1x = c1.x + CARD_WIDTH / 2,
        c1y = c1.y + CARD_HEIGHT / 2;
      const c2x = c2.x + CARD_WIDTH / 2,
        c2y = c2.y + CARD_HEIGHT / 2;
      const d = distance(c1x, c1y, c2x, c2y);
      if (d < REPULSION_DISTANCE) {
        const dx = c2x - c1x,
          dy = c2y - c1y;
        const angle = Math.atan2(dy, dx);
        const force = (REPULSION_DISTANCE - d) * REPULSION_FORCE;
        c1.vx -= Math.cos(angle) * force;
        c1.vy -= Math.sin(angle) * force;
        c2.vx += Math.cos(angle) * force;
        c2.vy += Math.sin(angle) * force;
      }
    }
  }
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
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
window.windowResized = () => resizeCanvas(windowWidth, windowHeight);
