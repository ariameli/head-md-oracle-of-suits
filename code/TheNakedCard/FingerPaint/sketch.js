let drawing = [];
let prevPointer = { x: null, y: null };
let stencilImg;
let paintLayer;
let stencilForMask;
let invertedStencilMask; // new
let maskLayer; // added
let stencilScale = 0.6; // fraction of canvas (adjustable)
let stencilX = 0,
  stencilY = 0,
  stencilW = 0,
  stencilH = 0;

function preload() {
  stencilImg = loadImage("images/stencil.png"); // ensure path is correct
}

function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);

  // initialize MediaPipe settings
  setupHands();
  // start camera using MediaPipeHands.js helper
  setupVideo();

  paintLayer = createGraphics(windowWidth, windowHeight);
  paintLayer.pixelDensity(1); // optional: keep consistent

  // create compositing buffer used every frame
  maskLayer = createGraphics(windowWidth, windowHeight);
  maskLayer.pixelDensity(1);

  // create a graphics buffer for the stencil and draw the resized stencil into it
  stencilForMask = createGraphics(width, height);

  // compute centered stencil size keeping aspect ratio
  let maxW = width * stencilScale;
  let maxH = height * stencilScale;
  let imgAspect = stencilImg.width / stencilImg.height;
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
  // draw stencil scaled and centered
  stencilForMask.image(stencilImg, stencilX, stencilY, stencilW, stencilH);

  // create a single inverted mask image once (mask() is destructive)
  invertedStencilMask = stencilForMask.get();
  invertedStencilMask.loadPixels();
  for (let i = 0; i < invertedStencilMask.pixels.length; i += 4) {
    // invert alpha channel
    invertedStencilMask.pixels[i + 3] = 255 - invertedStencilMask.pixels[i + 3];
  }
  invertedStencilMask.updatePixels();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // keep buffers in sync with main canvas size
  if (paintLayer) paintLayer.resizeCanvas(windowWidth, windowHeight);
  if (maskLayer) maskLayer.resizeCanvas(windowWidth, windowHeight);
  if (stencilForMask) {
    stencilForMask.resizeCanvas(windowWidth, windowHeight);

    // recompute centered stencil size keeping aspect ratio
    let maxW = width * stencilScale;
    let maxH = height * stencilScale;
    let imgAspect = stencilImg.width / stencilImg.height;
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
    stencilForMask.image(stencilImg, stencilX, stencilY, stencilW, stencilH);

    // recreate inverted mask after resize
    invertedStencilMask = stencilForMask.get();
    invertedStencilMask.loadPixels();
    for (let i = 0; i < invertedStencilMask.pixels.length; i += 4) {
      invertedStencilMask.pixels[i + 3] =
        255 - invertedStencilMask.pixels[i + 3];
    }
    invertedStencilMask.updatePixels();
  }
}

function draw() {
  background(0);
  strokeWeight(2);

  if (
    detections &&
    detections.multiHandLandmarks &&
    detections.multiHandLandmarks.length > 0
  ) {
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

  // --- Use compositing to keep paint only inside the stencil (use inverted mask) ---
  maskLayer.clear();
  // copy paint into compositing buffer
  maskLayer.image(paintLayer, 0, 0);

  // Keep paint only where the inverted stencil mask is opaque
  maskLayer.drawingContext.globalCompositeOperation = "destination-in";
  maskLayer.image(invertedStencilMask, 0, 0);

  // restore default composite mode
  maskLayer.drawingContext.globalCompositeOperation = "source-over";

  // draw composited result to main canvas
  image(maskLayer, 0, 0);

  // draw the stencil overlay for reference (optional)
  image(stencilForMask, 0, 0);
}

// only the index finger tip landmark
function drawIndex(landmarks) {
  let mark = landmarks && landmarks[8];
  if (!mark) return;

  // normalized -> canvas coords
  let x = mark.x * width;
  let y = mark.y * height;

  // debug log - open DevTools Console and watch these values
  console.log("index tip:", mark.x, mark.y, "->", x, y);

  // show pointer
  noStroke();
  fill(0, 255, 255);
  circle(x, y, 20);

  // check whether the tip is inside the stencil bounding box
  const inside =
    x >= stencilX + 15 &&
    x <= stencilX + stencilW - 15 &&
    y >= stencilY + 15 &&
    y <= stencilY + stencilH - 15;

  if (!inside) {
    // leave prevPointer null so strokes don't continue across boundary
    prevPointer.x = null;
    prevPointer.y = null;
    return;
  }

  // start a new stroke if no previous point
  if (prevPointer.x === null || prevPointer.y === null) {
    prevPointer.x = x;
    prevPointer.y = y;
    return;
  }

  // store and paint the stroke (only happens when both points are inside)
  drawing.push([prevPointer.x, prevPointer.y, x, y]);

  paintLayer.push();
  paintLayer.strokeWeight(30);
  paintLayer.stroke(231, 0, 14);
  paintLayer.line(prevPointer.x, prevPointer.y, x, y);
  paintLayer.pop();

  // update prevPointer
  prevPointer.x = x;
  prevPointer.y = y;
}

// draw the thumb finger tip landmark
function drawThumb(landmarks) {
  // get the thumb fingertip landmark
  let mark = landmarks[FINGER_TIPS.thumb];

  noStroke();
  // set fill color for thumb fingertip
  fill(255, 255, 0);

  // adapt the coordinates (0..1) to canvas coordinates
  let x = mark.x * width;
  let y = mark.y * height;
  circle(x, y, 20);
}

function drawTips(landmarks) {
  noStroke();
  // set fill color for fingertips
  fill(0, 0, 255);

  // fingertip indices
  const tips = [4, 8, 12, 16, 20];

  for (let tipIndex of tips) {
    let mark = landmarks[tipIndex];
    // adapt the coordinates (0..1) to canvas coordinates
    let x = mark.x * width;
    let y = mark.y * height;
    circle(x, y, 10);
  }
}

function drawLandmarks(landmarks) {
  noStroke();
  // set fill color for landmarks
  fill(255, 0, 0);

  for (let mark of landmarks) {
    // adapt the coordinates (0..1) to canvas coordinates
    let x = mark.x * width;
    let y = mark.y * height;
    circle(x, y, 6);
  }
}

function drawConnections(landmarks) {
  // set stroke color for connections
  stroke(0, 255, 0);

  // iterate through each connection
  for (let connection of HAND_CONNECTIONS) {
    // get the two landmarks to connect
    const a = landmarks[connection[0]];
    const b = landmarks[connection[1]];
    // skip if either landmark is missing
    if (!a || !b) continue;
    // use canvas-scaled coordinates
    let ax = a.x * width;
    let ay = a.y * height;
    let bx = b.x * width;
    let by = b.y * height;
    line(ax, ay, bx, by);
  }
}
