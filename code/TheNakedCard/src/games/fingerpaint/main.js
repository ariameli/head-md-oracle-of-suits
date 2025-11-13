import {
  initHands,
  setupVideo,
  FINGER_TIPS,
  HAND_CONNECTIONS,
} from "../../lib/mediapipe/hands.js";

let detections = null;
let videoElement;
let introVideo;
let endOfGameVideo;
let drawing = [];
let prevPointer = { x: null, y: null };
let stencilImg;
let paintLayer;
let stencilForMask;
let invertedStencilMask;
let maskLayer;
let stencilScale = 0.6;
let stencilX = 0,
  stencilY = 0,
  stencilW = 0,
  stencilH = 0;

function preload() {
  // Use absolute path to existing asset to avoid relative path issues under dev server
  stencilImg = loadImage("../../../public/images/stencil.png");
  introVideo = createVideo(["../../../public/videos/heart-intro.mp4"], () => {
    introVideo.hide();
  });
  endOfGameVideo = createVideo(
    ["../../../public/videos/heart-ending.mp4"],
    () => {
      endOfGameVideo.hide();
    }
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  initHands({ maxNumHands: 1 }, onHandsResults);
  const { videoElement: vid } = setupVideo(true, async (el) => {
    await getHands().send({ image: el });
  });
  videoElement = vid;
  paintLayer = createGraphics(windowWidth, windowHeight);
  paintLayer.pixelDensity(1);
  maskLayer = createGraphics(windowWidth, windowHeight);
  maskLayer.pixelDensity(1);
  stencilForMask = createGraphics(width, height);
  layoutStencil();
}

function layoutStencil() {
  let maxW = width * stencilScale;
  let maxH = height * stencilScale;
  let imgAspect = stencilImg ? stencilImg.width / stencilImg.height : 1;
  if (maxW / maxH > imgAspect) {
    stencilH = maxH;
    stencilW = stencilH * imgAspect;
  } else {
    stencilW = maxW;
    stencilH = stencilW / imgAspect;
  }
  stencilX = (width - stencilW) / 2;
  stencilY = (height - stencilH) / 2;
  stencilForMask.clear();
  if (stencilImg)
    stencilForMask.image(stencilImg, stencilX, stencilY, stencilW, stencilH);
  invertedStencilMask = stencilForMask.get();
  invertedStencilMask.loadPixels();
  for (let i = 0; i < invertedStencilMask.pixels.length; i += 4) {
    invertedStencilMask.pixels[i + 3] = 255 - invertedStencilMask.pixels[i + 3];
  }
  invertedStencilMask.updatePixels();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (paintLayer) paintLayer.resizeCanvas(windowWidth, windowHeight);
  if (maskLayer) maskLayer.resizeCanvas(windowWidth, windowHeight);
  if (stencilForMask) stencilForMask.resizeCanvas(windowWidth, windowHeight);
  layoutStencil();
}

function draw() {
  background(0);

  maskLayer.clear();
  maskLayer.image(paintLayer, 0, 0);
  maskLayer.drawingContext.globalCompositeOperation = "destination-in";
  maskLayer.image(invertedStencilMask, 0, 0);
  maskLayer.drawingContext.globalCompositeOperation = "source-over";
  image(maskLayer, 0, 0);
  image(stencilForMask, 0, 0);
  if (detections?.multiHandLandmarks?.length) {
    for (let hand of detections.multiHandLandmarks) {
      drawIndex(hand);
      drawThumb(hand);
      drawTips(hand);
      drawConnections(hand);
      drawLandmarks(hand);
    }
  } else {
    prevPointer.x = null;
    prevPointer.y = null;
  }
}

function drawIndex(landmarks) {
  const mark = landmarks[FINGER_TIPS.index];
  let x = mark.x * width;
  let y = mark.y * height;
  noStroke();
  fill(0, 255, 255);
  circle(x, y, 20);
  const inside =
    x >= stencilX + 30 &&
    x <= stencilX + stencilW - 30 &&
    y >= stencilY + 30 &&
    y <= stencilY + stencilH - 30;
  if (!inside) {
    prevPointer.x = null;
    prevPointer.y = null;
    return;
  }
  if (prevPointer.x == null || prevPointer.y == null) {
    prevPointer.x = x;
    prevPointer.y = y;
    return;
  }
  drawing.push([prevPointer.x, prevPointer.y, x, y]);
  paintLayer.push();
  paintLayer.strokeWeight(50);
  paintLayer.stroke(231, 0, 14);
  paintLayer.line(prevPointer.x, prevPointer.y, x, y);
  paintLayer.pop();
  prevPointer.x = x;
  prevPointer.y = y;
}
function drawThumb(landmarks) {
  const mark = landmarks[FINGER_TIPS.thumb];
  noStroke();
  fill(255, 255, 0);
  circle(mark.x * width, mark.y * height, 20);
}
function drawTips(landmarks) {
  noStroke();
  fill(0, 0, 255);
  for (const idx of [4, 8, 12, 16, 20]) {
    const m = landmarks[idx];
    circle(m.x * width, m.y * height, 10);
  }
}
function drawLandmarks(landmarks) {
  noStroke();
  fill(255, 0, 0);
  for (const m of landmarks) {
    circle(m.x * width, m.y * height, 6);
  }
}
function drawConnections(landmarks) {
  stroke(0, 255, 0);
  strokeWeight(2);
  for (const [aI, bI] of HAND_CONNECTIONS) {
    const a = landmarks[aI];
    const b = landmarks[bI];
    if (!a || !b) continue;
    line(a.x * width, a.y * height, b.x * width, b.y * height);
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
