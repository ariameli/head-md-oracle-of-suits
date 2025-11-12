import {
  ObjectDetector,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

let videoElement;
let objectDetector;
let detections = null;
let selfieMode = true;
let showVideo = true;
let isProcessing = false;
// start screen state
let showStartScreen = true;
let startImage;
let introVideo = null;
let introPlaying = false;
let introEnded = false;
let waitingForB = false;
// routing / debounce state
let candidateLabel = null; // currently candidate label name (string)
let candidateScore = 0;
let candidateFrames = 0; // consecutive frames seen
let candidateStart = 0; // ms timestamp when candidate first seen
let isRedirecting = false;
const REQUIRED_CONSECUTIVE_FRAMES = 6; // or ~200-500 ms depending on FPS
const REQUIRED_STABLE_MS = 1200; // fallback time threshold
const MIN_SCORE_TO_CONSIDER = 0.5; // detection score threshold to consider

// scan effect state (idle scanning overlay)
let scanY = 0;
let scanSpeed = 4; // pixels per frame
let scanHeight = 120; // vertical size of the scanning band
let scanStep = 6; // step for gradient lines inside band

// mapping detected labels to game URLs (relative)
const LABEL_TO_GAME = {
  diamond: "crossbow-final/index.html",
  heart: "FingerPaint/index.html",
  baton: "carpioche/index.html",
};

// expose p5 functions to global scope
window.setup = setup;
window.draw = draw;
window.keyPressed = keyPressed;

function preload() {
  //startImage = loadImage("images/card-idle.png");
}

async function setup() {
  createCanvas(windowWidth, windowHeight);
  startImage = await loadImage("images/card-idle.png");

  // prepare intro video but don't play yet; hide DOM video and we'll draw it to canvas
  try {
    introVideo = createVideo(["videos/card-screaming-spotlight.mp4"], () => {
      // loaded
    });
    introVideo.hide();
    // when the video naturally ends, switch to black/waiting state
    introVideo.elt.onended = () => {
      introEnded = true;
      introPlaying = false;
      waitingForB = true;
      console.log("Intro video ended");
    };
  } catch (e) {
    console.warn("Could not load intro video:", e);
    introVideo = null;
  }

  // hidden video capture used by MediaPipe
  // Request explicit constraints so getUserMedia is called with video:true
  // (some p5 builds/versions require the constraint object instead of the
  // VIDEO constant). Also explicitly disable audio to avoid unwanted prompts.
  // This prevents the "At least one of audio and video must be requested" error.
  videoElement = createCapture({ video: true, audio: false });
  videoElement.size(640, 480);
  videoElement.hide();
  // videoElement = createCapture({ video: true, audio: false });
  // videoElement.size(windowWidth, windowHeight);
  // videoElement.hide();

  // Initialize MediaPipe Object Detector
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "model.tflite",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    scoreThreshold: 0.5,
    maxResults: 5,
  });

  // Start processing video frames
  processVideo();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  if (key === "v" || key === "V") {
    showVideo = !showVideo;
  }

  // start the program from the idle card when the user presses 's'
  if ((key === "s" || key === "S") && showStartScreen) {
    // kick off the intro video if available; otherwise proceed to scanning
    showStartScreen = false;
    if (introVideo) {
      introPlaying = true;
      introEnded = false;
      waitingForB = false;
      introVideo.elt.currentTime = 0;
      introVideo.play();
    }
  }

  // when intro has ended and we're waiting for 'b', pressing b resumes scanning
  if ((key === "b" || key === "B") && waitingForB) {
    waitingForB = false;
    // clear any candidate so the scanning overlay shows
    candidateLabel = null;
    candidateFrames = 0;
    candidateStart = 0;
  }
}

function draw() {
  background(0);

  // If we're still on the start screen, show the idle card image and a hint
  if (showStartScreen) {
    // if (startImage) {
    // draw image centered and scaled to fit while preserving aspect ratio
    imageMode(CENTER);
    image(startImage, windowWidth / 2, windowHeight / 2, 1000, windowHeight);
    // } else {
    //   // fallback: simple message
    //   push();
    //   fill(255);
    //   textAlign(CENTER, CENTER);
    //   textSize(24);
    //   text("Press S to start", width / 2, height / 2);
    //   pop();
    // }
    // do not proceed with video/detections until 's' is pressed
    return;
  }

  // If intro video is playing, draw it to the canvas and skip detection
  if (introPlaying && introVideo) {
    push();
    imageMode(CENTER);
    // scale to cover canvas while preserving aspect ratio
    const vw = introVideo.width || introVideo.elt.videoWidth || width;
    const vh = introVideo.height || introVideo.elt.videoHeight || height;
    const scale = Math.min(width / vw, height / vh);
    const drawW = vw * scale;
    const drawH = vh * scale;
    image(introVideo, width / 2, height / 2, drawW, drawH);
    pop();
    return;
  }

  // If intro has finished and we're waiting for 'b', show black background and hint
  if (introEnded && waitingForB) {
    push();
    background(0);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(
      "Intro finished — press B to continue to scanning",
      width / 2,
      height / 2
    );
    pop();
    return;
  }

  // Use the underlying HTMLVideoElement readyState to check availability.
  if (
    showVideo &&
    videoElement &&
    videoElement.elt &&
    videoElement.elt.readyState > 0
  ) {
    // Mirror on-canvas if selfieMode is enabled
    if (selfieMode) {
      push();
      //image(videoElement, 0, 0, width, height);
      pop();
    } else {
      //image(videoElement, 0, 0, width, height);
    }
  } else {
    // faded background when video is off
    fill(30);
    rect(0, 0, width, height);
  }

  // If we're waiting for detection (no candidate and no detections), show a
  // subtle scanning overlay to indicate the system is actively scanning.
  const noDetections =
    !detections || !detections.detections || detections.detections.length === 0;
  if (!candidateLabel && noDetections) {
    // advance scan Y (wrap around the canvas)
    scanY += scanSpeed;
    if (scanY > height + scanHeight) scanY = -scanHeight;

    const scanCenter = scanY;

    push();
    noStroke();
    // subtle dim of the whole canvas while scanning
    fill(0, 24);
    rect(0, 0, windowWidth, windowHeight);

    // draw gradient horizontal band across the canvas
    for (let off = -scanHeight / 2; off <= scanHeight / 2; off += scanStep) {
      const alpha = map(Math.abs(off), 0, scanHeight / 2, 160, 0);
      fill(40, 220, 160, alpha * 0.9);
      const y = scanCenter + off;
      if (y >= 0 && y <= height) {
        rect(0, y, windowWidth, scanStep + 1);
      }
    }

    // a bright center line
    fill(120, 255, 200, 220);
    rect(0, scanCenter, windowWidth, 2);
    pop();
  }

  // draw detected objects with bounding boxes and labels
  if (detections && detections.detections) {
    strokeWeight(2);
    textSize(16);
    textAlign(LEFT, TOP);

    for (const detection of detections.detections) {
      const bbox = detection.boundingBox;
      const category = detection.categories[0];

      // Calculate bounding box coordinates
      let x = bbox.originX;
      let y = bbox.originY;
      let w = bbox.width;
      let h = bbox.height;

      // Flip horizontally if in selfie mode
      if (selfieMode) {
        x = width - x - w;
      }

      // Draw bounding box
      stroke(0, 255, 0);
      strokeWeight(3);
      noFill();
      rect(x, y, w, h);

      // Draw label with background
      const label = `${category.categoryName} (${(category.score * 100).toFixed(
        0
      )}%)`;
      const textW = textWidth(label);
      const padding = 4;

      fill(0, 255, 0);
      noStroke();
      rect(x, y - 24, textW + padding * 2, 24);

      fill(0);
      text(label, x + padding, y - 20);
    }
  }

  // small overlay showing candidate label and countdown to redirect
  if (candidateLabel && !isRedirecting) {
    const elapsed = Date.now() - candidateStart;
    // compute progress between 0 and 1
    const progress = Math.min(1, Math.max(0, elapsed / REQUIRED_STABLE_MS));

    push();
    rectMode(CENTER);
    noStroke();
    fill(0, 160);
    rect(width / 2, height - 36, 300, 48, 8);

    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    const pretty = `${candidateLabel} detected — launching in ${Math.ceil(
      (1 - progress) * 1
    )}s`;
    text(pretty, width / 2, height - 36);
    pop();
  }
}

async function processVideo() {
  if (!objectDetector || !videoElement || videoElement.elt.readyState !== 4) {
    requestAnimationFrame(processVideo);
    return;
  }

  // Ensure video has valid dimensions
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

  // examine detections to find a candidate label (highest score)
  if (detections && detections.detections && detections.detections.length > 0) {
    let best = null;
    for (const d of detections.detections) {
      const cat = d.categories && d.categories[0];
      if (!cat) continue;
      const name = String(cat.categoryName).toLowerCase();
      const score = cat.score || 0;
      if (score < MIN_SCORE_TO_CONSIDER) continue;
      if (!best || score > best.score) {
        best = { name, score };
      }
    }

    if (best) {
      // if it's a mapped label, consider it
      if (LABEL_TO_GAME[best.name]) {
        if (candidateLabel === best.name) {
          candidateFrames++;
        } else {
          candidateLabel = best.name;
          candidateScore = best.score;
          candidateFrames = 1;
          candidateStart = Date.now();
        }

        // check stability: either enough consecutive frames or enough ms
        const stableByFrames = candidateFrames >= REQUIRED_CONSECUTIVE_FRAMES;
        const stableByTime = Date.now() - candidateStart >= REQUIRED_STABLE_MS;

        if (!isRedirecting && (stableByFrames || stableByTime)) {
          isRedirecting = true;
          const target = LABEL_TO_GAME[candidateLabel];
          // small delay so user can see the overlay (optional)
          setTimeout(() => {
            window.location.href = target;
          }, 450);
        }
      } else {
        // label not mapped, reset
        candidateLabel = null;
        candidateFrames = 0;
      }
    } else {
      // no usable best detection
      candidateLabel = null;
      candidateFrames = 0;
    }
  } else {
    // no detections
    candidateLabel = null;
    candidateFrames = 0;
  }

  requestAnimationFrame(processVideo);
}
