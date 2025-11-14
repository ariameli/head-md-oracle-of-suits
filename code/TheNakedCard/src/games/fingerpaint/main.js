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
let isIntroPlaying = true;
let isEndPlaying = false;
const STENCIL_MARGIN = 30; // keep in sync with paint bounds
const SAMPLE_STEP = 4; // finer sampling grid for better coverage accuracy
let COVERAGE_THRESHOLD = 0.75; // more forgiving by default; override via window.FP_COVERAGE_THRESHOLD
let sampleCoords = [];
let sampleTotal = 0;
let lastCoverageCheck = 0;
let coverageRatio = 0;
const DEBUG_COVERAGE = false; // set true or toggle window.FP_DEBUG_COVERAGE = true in console
const isDebug = () => {
  try {
    return DEBUG_COVERAGE || window.FP_DEBUG_COVERAGE === true;
  } catch (e) {
    return DEBUG_COVERAGE;
  }
};
const getThreshold = () => {
  try {
    const v = Number(window.FP_COVERAGE_THRESHOLD);
    if (!Number.isNaN(v) && v > 0 && v <= 1) return v;
  } catch (e) {}
  return COVERAGE_THRESHOLD;
};

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
  // Critical: ensure consistent pixel density so pixel sampling aligns with coordinates
  stencilForMask.pixelDensity(1);
  layoutStencil();
  if (introVideo) {
    introVideo.elt.currentTime = 0;
    introVideo.play();
    introVideo.elt.onended = () => {
      isIntroPlaying = false;
      introVideo.pause();
      introVideo.elt.currentTime = 0;
      introVideo.hide();
    };
  } else {
    isIntroPlaying = false;
  }
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
  // Precompute sample coordinates within the target (transparent) region
  // Build sample positions by reading alpha with get(x,y) to avoid pixel-density pitfalls
  sampleCoords = [];
  sampleTotal = 0;
  const x0 = Math.max(0, Math.floor(stencilX + STENCIL_MARGIN));
  const y0 = Math.max(0, Math.floor(stencilY + STENCIL_MARGIN));
  const x1 = Math.min(width, Math.ceil(stencilX + stencilW - STENCIL_MARGIN));
  const y1 = Math.min(height, Math.ceil(stencilY + stencilH - STENCIL_MARGIN));
  for (let y = y0; y < y1; y += SAMPLE_STEP) {
    for (let x = x0; x < x1; x += SAMPLE_STEP) {
      const a = invertedStencilMask.get(x, y)[3] || 0; // alpha after inversion
      if (a > 128) {
        sampleCoords.push([x, y]);
      }
    }
  }
  sampleTotal = sampleCoords.length;
  // Fallback: if nothing found (mask alpha unexpected), try using original mask with opposite predicate
  if (sampleTotal === 0) {
    for (let y = y0; y < y1; y += SAMPLE_STEP) {
      for (let x = x0; x < x1; x += SAMPLE_STEP) {
        const a0 = stencilForMask.get(x, y)[3] || 0; // original alpha
        if (a0 < 128) {
          sampleCoords.push([x, y]);
        }
      }
    }
    sampleTotal = sampleCoords.length;
  }
  console.info(
    "[fingerpaint] sample points inside paintable region:",
    sampleTotal
  );
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

  // Intro video overlay and early return while playing
  if (isIntroPlaying && introVideo) {
    push();
    imageMode(CENTER);
    const vw = introVideo.width || introVideo.elt.videoWidth || width;
    const vh = introVideo.height || introVideo.elt.videoHeight || height;
    const scale = Math.min(width / vw, height / vh);
    image(introVideo, width / 2, height / 2, vw * scale, vh * scale);
    pop();
    return;
  }

  // If ending video is playing, render it full-screen and skip game draws
  if (isEndPlaying && endOfGameVideo) {
    push();
    imageMode(CENTER);
    const vw = endOfGameVideo.width || endOfGameVideo.elt.videoWidth || width;
    const vh =
      endOfGameVideo.height || endOfGameVideo.elt.videoHeight || height;
    const scale = Math.min(width / vw, height / vh);
    image(endOfGameVideo, width / 2, height / 2, vw * scale, vh * scale);
    pop();
    return;
  }

  // Ensure we draw gameplay layers with top-left origin
  imageMode(CORNER);
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

  // Instruction overlay (shown only during active painting phase)
  push();
  const instruction =
    "Touche les symboles du pochoir pour ajouter de la couleur";
  textAlign(CENTER, TOP);
  textSize(42);
  noStroke();
  // Background pill for readability
  const paddingX = 28;
  const paddingY = 14;
  const maxWidth = width * 0.85;
  fill(0, 140);
  const tw = textWidth(instruction);
  const bw = Math.min(tw + paddingX * 2, maxWidth);
  const bx = width / 2 - bw / 2;
  const by = 10;
  rect(bx, by, bw, paddingY * 2 + 24, 12);
  fill(255);
  text(instruction, width / 2, by + paddingY + 15);
  pop();

  // Periodically check coverage; if complete, trigger ending and redirect
  if (
    !isEndPlaying &&
    frameCount - lastCoverageCheck >= 15 &&
    sampleTotal > 0
  ) {
    let colored = 0;
    for (let i = 0; i < sampleCoords.length; i++) {
      const [sx, sy] = sampleCoords[i];
      const c = maskLayer.get(sx, sy); // [r,g,b,a]
      if (c[3] > 10) colored++;
    }
    coverageRatio = colored / sampleTotal;
    lastCoverageCheck = frameCount;
    if (frameCount % 60 === 0) {
      console.log(
        `[fingerpaint] coverage: ${(coverageRatio * 100).toFixed(
          1
        )}% (${colored}/${sampleTotal})`
      );
    } else if (
      !isDebug() &&
      coverageRatio >= 0.8 &&
      coverageRatio < getThreshold()
    ) {
      // one-time nudge log when user is close to completion
      if (!window.__fpLogged80) {
        window.__fpLogged80 = true;
        console.info(
          `[fingerpaint] nearly complete: ${(coverageRatio * 100).toFixed(0)}%`
        );
      }
    }
    if (coverageRatio >= getThreshold()) {
      isEndPlaying = true;
      if (endOfGameVideo) {
        endOfGameVideo.elt.currentTime = 0;
        endOfGameVideo.play();
        endOfGameVideo.elt.onended = () => {
          try {
            window.sessionStorage.setItem("skipIntro", "1");
          } catch (e) {}
          window.location.href = "/src/launcher/index.html";
        };
      } else {
        try {
          window.sessionStorage.setItem("skipIntro", "1");
        } catch (e) {}
        window.location.href = "/src/launcher/index.html";
      }
    }
  }
}

function drawIndex(landmarks) {
  const mark = landmarks[FINGER_TIPS.index];
  let x = mark.x * width;
  let y = mark.y * height;
  noStroke();
  fill(62, 119, 74);
  circle(mark.x * width, mark.y * height, 10);
  const inside =
    x >= stencilX + STENCIL_MARGIN &&
    x <= stencilX + stencilW - STENCIL_MARGIN &&
    y >= stencilY + STENCIL_MARGIN &&
    y <= stencilY + stencilH - STENCIL_MARGIN;
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
  fill(62, 119, 74);
  circle(mark.x * width, mark.y * height, 5);
}
function drawTips(landmarks) {
  noStroke();
  fill(62, 119, 74);
  for (const idx of [4, 8, 12, 16, 20]) {
    const mark = landmarks[idx];
    circle(mark.x * width, mark.y * height, 10);
  }
}
function drawLandmarks(landmarks) {
  noStroke();
  fill(62, 119, 74);
  for (const m of landmarks) {
    circle(m.x * width, m.y * height, 6);
  }
}
function drawConnections(landmarks) {
  stroke(62, 119, 74);
  strokeWeight(14);
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
