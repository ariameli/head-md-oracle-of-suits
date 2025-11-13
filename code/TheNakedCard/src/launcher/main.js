import { LABEL_TO_GAME } from "../config/routes.js";
import {
  REQUIRED_CONSECUTIVE_FRAMES,
  REQUIRED_STABLE_MS,
  MIN_SCORE_TO_CONSIDER,
} from "../config/thresholds.js";
import {
  ObjectDetector,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

let videoElement;
let objectDetector;
let detections = null;
let selfieMode = true;
let isProcessing = false;
let appState = "start"; // 'start' | 'intro' | 'box' | 'scan'
let startImage;
let introVideo = null;
let boxOpenedVideo;
let eyeOpenVideo;
let eyeVideoActive = false;
let eyeOpenAudio;
let symbolImages = {};

let boxImage;
let font;

let candidateLabel = null;
let candidateFrames = 0;
let candidateStart = 0;
let isRedirecting = false;
const REDIRECT_DELAY_MS = 3000;
let redirectStart = 0;
let redirectTimeoutId = null;

let scanY = 0;
let scanSpeed = 4;
let scanHeight = 120;
let scanStep = 6;
let scanBuffer = null;

function preload() {
  boxImage = loadImage("../../public/images/box-open.png");
  font = loadFont("../../public/fonts/G2 TGR Medium/G2TGR-Medium.ttf");
  boxOpenedVideo = createVideo(["../../public/videos/box-opened.mp4"]);
  boxOpenedVideo.hide();
  eyeOpenVideo = createVideo(["../../public/videos/eye-open-close.mp4"]);
  eyeOpenVideo.hide();
  eyeOpenAudio = loadSound("../../public/audio/son-scan.mp3");
  for (const label of Object.keys(LABEL_TO_GAME)) {
    const name = String(label).toLowerCase();
    symbolImages[name] = loadImage(`../../public/images/symbols/${name}.png`);
  }
}

async function setup() {
  createCanvas(windowWidth, windowHeight);
  startImage = await loadImage("../../public/images/card-idle.jpeg");
  buildScanBuffer();
  // Check if we should skip the whole intro/start flow and jump directly to scanning.
  const skipIntro = (() => {
    try {
      return window.sessionStorage.getItem("skipIntro") === "1";
    } catch (e) {
      return false;
    }
  })();
  try {
    if (!skipIntro) {
      introVideo = createVideo([
        "../../public/videos/card-screaming-spotlight.mp4",
      ]);
      introVideo.hide();
    }
  } catch (e) {
    console.warn("Could not load intro video:", e);
    introVideo = null;
  }
  videoElement = createCapture({ video: true, audio: false });
  videoElement.size(640, 480);
  videoElement.hide();
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "../../public/models/model.tflite",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    scoreThreshold: 0.5,
    maxResults: 5,
  });
  if (skipIntro) {
    // Force state to scan and enable camera usage immediately.
    appState = "scan";
    setCameraEnabled(true);
    try {
      window.sessionStorage.removeItem("skipIntro");
    } catch (e) {}
  }
  processVideo();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildScanBuffer();
}

function keyPressed() {
  if ((key === "s" || key === "S") && appState === "start") {
    if (introVideo) {
      appState = "intro";
      setCameraEnabled(false); // disable webcam during intro
      introVideo.elt.currentTime = 0;
      introVideo.play();
    } else {
      appState = "scan";
      setCameraEnabled(true);
    }
    //appState = "scan";
  }
  if (
    (key === "b" || key === "B") &&
    appState === "intro" &&
    introVideo?.elt?.ended
  ) {
    // Go to box opening screen instead of scanning directly
    appState = "box";
    setCameraEnabled(false);
    candidateLabel = null;
    candidateFrames = 0;
    candidateStart = 0;
    if (boxOpenedVideo) {
      boxOpenedVideo.elt.currentTime = 0;
      boxOpenedVideo.elt.onended = () => {
        appState = "scan";
        setCameraEnabled(true);
      };
      boxOpenedVideo.play();
    } else {
      appState = "scan";
      setCameraEnabled(true);
    }
  }
}

function draw() {
  background(0);
  if (appState === "start") {
    renderEyeVideo(false);
    drawStartScreen();
    return;
  }
  if (appState === "intro") {
    renderEyeVideo(false);
    drawIntro();
    return;
  }
  if (appState === "box") {
    renderEyeVideo(false);
    drawBoxOpening();
    return;
  }
  // From here on, we're in 'scan' state
  const noDetections = !detections?.detections?.length;
  renderEyeVideo(noDetections);
  if (appState === "scan" && detections?.detections) {
    drawDetectionsOverlay();
  }
  drawScanningOverlay();
  if (candidateLabel) {
    drawCountdown();
  }
}

async function processVideo() {
  // Do not process video frames unless we're actively scanning
  if (appState !== "scan") {
    requestAnimationFrame(processVideo);
    return;
  }
  if (!objectDetector || !videoElement || videoElement.elt.readyState !== 4) {
    requestAnimationFrame(processVideo);
    return;
  }
  if (videoElement.elt.videoWidth === 0 || videoElement.elt.videoHeight === 0) {
    requestAnimationFrame(processVideo);
    return;
  }
  if (!isProcessing) {
    isProcessing = true;
    const nowInMs = Date.now();
    detections = objectDetector.detectForVideo(videoElement.elt, nowInMs);
    isProcessing = false;
  }
  if (detections?.detections?.length) {
    let best = null;
    for (const d of detections.detections) {
      const cat = d.categories?.[0];
      if (!cat) continue;
      const name = String(cat.categoryName).toLowerCase();
      const score = cat.score || 0;
      if (score < MIN_SCORE_TO_CONSIDER) continue;
      if (!best || score > best.score) best = { name, score };
    }
    if (best && LABEL_TO_GAME[best.name]) {
      if (candidateLabel === best.name) {
        candidateFrames++;
      } else {
        resetRedirectTimer();
        candidateLabel = best.name;
        candidateFrames = 1;
        candidateStart = Date.now();
      }
      const stableByFrames = candidateFrames >= REQUIRED_CONSECUTIVE_FRAMES;
      const stableByTime = Date.now() - candidateStart >= REQUIRED_STABLE_MS;
      if (!isRedirecting && (stableByFrames || stableByTime)) {
        const target = LABEL_TO_GAME[candidateLabel];
        if (!target) {
          resetRedirectTimer();
          clearCandidateState();
          requestAnimationFrame(processVideo);
          return;
        }
        isRedirecting = true;
        redirectStart = Date.now();
        redirectTimeoutId = setTimeout(() => {
          window.location.href = target;
        }, REDIRECT_DELAY_MS);
      }
    } else {
      if (!isRedirecting) {
        resetRedirectTimer();
        clearCandidateState();
      }
    }
  } else {
    if (!isRedirecting) {
      resetRedirectTimer();
      clearCandidateState();
    }
  }
  requestAnimationFrame(processVideo);
}

function buildScanBuffer() {
  scanBuffer = createGraphics(width, scanHeight);
  const g = scanBuffer;
  g.noStroke();
  for (let off = 0; off <= scanHeight; off += scanStep) {
    const distFromCenter = Math.abs(off - scanHeight / 2);
    const alpha = map(distFromCenter, 0, scanHeight / 2, 160, 0);
    g.fill(40, 220, 160, alpha * 0.9);
    g.rect(0, off, width, scanStep + 1);
  }
}

function resetRedirectTimer() {
  if (redirectTimeoutId) {
    clearTimeout(redirectTimeoutId);
    redirectTimeoutId = null;
  }
  redirectStart = 0;
  isRedirecting = false;
}

function clearCandidateState() {
  candidateLabel = null;
  candidateFrames = 0;
  candidateStart = 0;
}

// Enable/disable camera tracks without fully tearing down the stream
function setCameraEnabled(enabled) {
  try {
    const stream = videoElement?.elt?.srcObject;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      track.enabled = !!enabled;
    }
  } catch (e) {
    // non-fatal; best-effort
  }
}

// --- Extracted draw helpers ---
function drawStartScreen() {
  imageMode(CENTER);
  const vw = startImage.width || width;
  const vh = startImage.height || height;
  const scale = Math.min(width / vw, height / vh);
  image(startImage, width / 2, height / 2, vw * scale * 1.3, vh * scale * 1.3);

  //image(startImage, windowWidth / 2, windowHeight / 2, 1000, windowHeight);
}

function drawIntro() {
  if (introVideo && !introVideo.elt.ended) {
    imageMode(CENTER);
    const vw = introVideo.width || introVideo.elt.videoWidth || width;
    const vh = introVideo.height || introVideo.elt.videoHeight || height;
    const scale = Math.min(width / vw, height / vh);
    image(introVideo, width / 2, height / 2, vw * scale, vh * scale);
  } else {
    fill(255);
    textAlign(LEFT, CENTER);
    imageMode(CENTER);
    image(boxImage, windowWidth - 300, windowHeight / 2 - 50, 1200, 1200);
    textFont(font);
    textSize(40);
    text(
      "Ouvre la boîte devant toi\npour aider la Carte.",
      200,
      windowHeight / 2
    );
  }
}

function drawScanningOverlay() {
  if (appState !== "scan") return;
  scanY += scanSpeed;
  if (scanY > height) scanY = -scanHeight;
  noStroke();
  fill(0, 24);
  rect(0, 0, width, height);
  if (scanBuffer) {
    push();
    imageMode(CORNER);
    image(scanBuffer, 0, scanY, width, scanHeight);
    pop();
    fill(120, 255, 200, 220);
    rect(0, scanY + scanHeight / 2, width, 2);
  }
}

function drawDetectionsOverlay() {
  if (appState !== "scan") return;
  for (const detection of detections.detections) {
    const bbox = detection.boundingBox;
    const category = detection.categories[0];
    let x = bbox.originX;
    let y = bbox.originY;
    let w = bbox.width;
    let h = bbox.height;
    if (selfieMode) x = width - x - w;
    const label = String(category?.categoryName || "").toLowerCase();
    const img = symbolImages[label];
    if (img && img.width > 0) {
      push();
      imageMode(CENTER);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const maxSide = Math.max(w, h) * 1.1;
      const scale = maxSide / Math.max(img.width, img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      image(img, cx, cy, drawW, drawH);
      pop();
    }
  }
}

function drawCountdown() {
  const now = Date.now();
  const hasRedirectTimer = isRedirecting && redirectStart;
  const stabilityElapsed = candidateStart ? now - candidateStart : 0;
  const stabilityRemainingMs = Math.max(
    0,
    REQUIRED_STABLE_MS - stabilityElapsed
  );
  const redirectElapsed = redirectStart ? now - redirectStart : 0;
  const redirectRemainingMs = hasRedirectTimer
    ? Math.max(0, REDIRECT_DELAY_MS - redirectElapsed)
    : REDIRECT_DELAY_MS;

  rectMode(CENTER);
  noStroke();
  fill(0, 160);
  rect(width / 2, height - 36, 300, 48, 8);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  textFont(font);
  const displayLabel = candidateLabel ? candidateLabel.toUpperCase() : "";
  const message = hasRedirectTimer
    ? `${displayLabel} detected — launching in ${Math.max(
        0,
        Math.ceil(redirectRemainingMs / 1000)
      )}s`
    : `${displayLabel} detected — hold steady ${Math.max(
        0,
        Math.ceil(stabilityRemainingMs / 1000)
      )}s`;
  text(message, width / 2, height - 36);
}

function drawBoxOpening() {
  if (boxOpenedVideo && !boxOpenedVideo.elt.ended) {
    imageMode(CENTER);
    const vw = boxOpenedVideo.width || boxOpenedVideo.elt.videoWidth || width;
    const vh =
      boxOpenedVideo.height || boxOpenedVideo.elt.videoHeight || height;
    const scale = Math.min(width / vw, height / vh);
    image(boxOpenedVideo, width / 2, height / 2, vw * scale, vh * scale);
  } else {
    // Safety fallback if ended or missing
    if (appState === "box") {
      appState = "scan";
      setCameraEnabled(true);
    }
  }
}

function renderEyeVideo(shouldPlay) {
  if (!eyeOpenVideo) return;
  if (shouldPlay) {
    if (!eyeVideoActive) {
      eyeOpenVideo.loop();
      eyeOpenAudio.loop();
      eyeVideoActive = true;
    }
    push();
    imageMode(CENTER);
    const vw = eyeOpenVideo.width || eyeOpenVideo.elt.videoWidth || width;
    const vh = eyeOpenVideo.height || eyeOpenVideo.elt.videoHeight || height;
    const scale = Math.max(width / vw, height / vh);
    image(eyeOpenVideo, width / 2, height / 2, vw * scale, vh * scale);
    pop();
  } else if (eyeVideoActive) {
    eyeOpenVideo.pause();
    if (eyeOpenAudio) {
      eyeOpenAudio.stop();
    }
    eyeOpenVideo.elt.currentTime = 0;
    eyeVideoActive = false;
  }
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.keyPressed = keyPressed;
window.windowResized = windowResized;
