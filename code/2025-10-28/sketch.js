function setup() {
  createCanvas(640, 480);
  const video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
}

function draw() {
  background(220);
}
