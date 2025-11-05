let video;
let cnv;
let captureButton;
let nameInput;
let statusP;
let isCountingDown = false; // added: prevent multiple timers

function setup() {
  // change canvas size if you prefer
  cnv = createCanvas(640, 480);
  // show webcam feed
  video = createCapture({
    video: true,
    flipped: true, // Flip the video horizontally
  });
  video.size(width, height);
  video.hide();

  // input for filename
  nameInput = createInput("");
  nameInput.attribute("placeholder", "Enter filename (no extension)");
  nameInput.style("width", "220px");
  nameInput.position(10, height + 10);

  // button to take picture
  captureButton = createButton("Take Photo");
  captureButton.position(10 + 220 + 12, height + 10); // fixed positions relative to input
  captureButton.mousePressed(takePhoto);

  // simple status text
  statusP = createP("");
  statusP.position(10, height + 40);
  statusP.html("Ready");
}

function draw() {
  background(0);
  // draw webcam feedback to canvas
  image(video, 0, 0, width, height);
}

function takePhoto() {
  // prevent starting another countdown while one is running
  if (isCountingDown) return;
  isCountingDown = true;
  captureButton.attribute("disabled", ""); // disable button during countdown

  let count = 2;
  statusP.html("Taking photo in " + count + "...");

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      statusP.html("Taking photo in " + count + "...");
    } else {
      clearInterval(interval);
      // perform the actual capture
      doCapture();
      // re-enable button and reset flag
      captureButton.removeAttribute("disabled");
      isCountingDown = false;
    }
  }, 1000);
}

function doCapture() {
  let name = nameInput.value().trim();
  if (!name) {
    const t =
      year() +
      "-" +
      nf(month(), 2) +
      nf(day(), 2) +
      "-" +
      nf(hour(), 2) +
      nf(minute(), 2) +
      nf(second(), 2);
    name = "photo-" + t;
  }
  // sanitize filename: replace spaces and illegal chars with underscores
  name = name.replace(/[\/\\\?\%\*\:\|\"<>\s]+/g, "_");

  // create a timestamp for the moment the picture is taken
  const timestamp =
    nf(year(), 4) +
    nf(month(), 2) +
    nf(day(), 2) +
    "_" +
    nf(hour(), 2) +
    nf(minute(), 2) +
    nf(second(), 2);

  // append date-time instead of an incrementing number
  const finalName = name + "_" + timestamp;

  statusP.html("Taking photo...");

  // create a smaller offscreen buffer and draw the current video frame into it
  const outW = Math.floor(width / 2); // change divisor to get different resolution
  const outH = Math.floor(height / 2);
  const small = createGraphics(outW, outH);
  small.image(video, 0, 0, outW, outH);

  // save the smaller buffer instead of the full canvas
  saveCanvas(small, finalName, "jpeg");

  statusP.html("Saved: " + finalName + ".jpeg");
}
