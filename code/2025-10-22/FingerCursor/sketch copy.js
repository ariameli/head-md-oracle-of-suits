"use strict";

let distMouse = 15;
let cols;
let rows;
let size = 10;
let offset = 4;
let blocks = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  angleMode(DEGREES);
  //colorMode(HSB);
  cols = width / size;
  rows = height / size;

  for (let i = 0; i < cols; i++) {
    blocks[i] = [];
    for (let j = 0; j < rows; j++) {
      blocks[i][j] = new Block(size / 2 + i * size, size / 2 + j * size);
    }
  }
}

function draw() {
  background(22);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      blocks[i][j].display();
      blocks[i][j].move();
    }
  }
}
