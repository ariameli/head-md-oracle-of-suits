'use strict';
var shapes;
var img;
var capture;

function preload() {
  img = loadImage("images/pic.png");

  shapes = [];
  shapes.push(loadImage('images/056.svg'));
  shapes.push(loadImage('images/076.svg'));
  shapes.push(loadImage('images/082.svg'));
  shapes.push(loadImage('images/096.svg'));
  shapes.push(loadImage('images/117.svg'));
  shapes.push(loadImage('images/148.svg'));
  shapes.push(loadImage('images/152.svg'));
  shapes.push(loadImage('images/157.svg'));
  shapes.push(loadImage('images/164.svg'));
  shapes.push(loadImage('images/166.svg'));
  shapes.push(loadImage('images/186.svg'));
  shapes.push(loadImage('images/198.svg'));
  shapes.push(loadImage('images/224.svg'));
}

function setup() {
  createCanvas(600, 900);
  //image(img);
  capture = createCapture(VIDEO,{ flipped:true });
  capture.size(100, 180);
  capture.hide();
}

function draw() {
  background(255);

  // Safety: ensure capture has dimensions
  var w = max(1, capture.width);
  var h = max(1, capture.height);

  // tile size on the canvas based on capture size
  var titleWidth = 603 / w;
  var titleHeight = 873 / h;

  // load current webcam pixels once per frame
  capture.loadPixels();

  // step controls performance/detail: 1 = full resolution, increase to speed up
  var step = 1.5;

  for (var gridX = 0; gridX < img.width; gridX++) {
    for (var gridY = 0; gridY < img.height; gridY++) {
      // grid position + title size
      // var titleWidth = 603 / img.width;
      // var titleHeight = 873 / img.height;
      var posX = titleWidth * gridX;
      var posY = titleHeight * gridY;

      // get current color from webcam
      var c = capture.get(min(gridX, w - 1), min(gridY, h - 1));

      // greyscale conversion (same weights as original)
      var greyscale = round(red(c) * 0.222 + green(c) * 0.707 + blue(c) * 0.071);
      var gradientToIndex = round(map(greyscale, 0, 255, 0, shapes.length - 1));

      image(shapes[gradientToIndex], posX, posY, titleWidth * step, titleHeight * step);
    }
  }

}

function keyReleased() {
  if (key == 's' || key == 'S') saveCanvas(gd.timestamp(), 'png');
}