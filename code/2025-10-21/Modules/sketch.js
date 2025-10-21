"use strict";

let distMouse = 25;
let cols;
let rows;
let size = 50;
let offset = 0;
let blocks = [];
let rounds = [];
let lines = [];
let colorRect, colorCirc, colorLine;

let weights = [4, 8, 12];

function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  angleMode(DEGREES);
  cols = width / size;
  rows = height / size;

  for (let i = 0; i < cols; i++) {
    rounds[i] = [];
    blocks[i] = [];
    lines[i] = [];
    for (let j = 0; j < rows; j++) {
      if ((j % 2 == 0 && i % 2 == 0) || (j % 2 == 1 && i % 2 == 1)) {
        colorRect = color("brown");
        colorLine = color("brown");
        colorCirc = color("pink");
      } else {
        colorRect = color("pink");
        colorLine = color("pink");
        colorCirc = color("brown");
      }
      blocks[i][j] = new Block(
        size / 2 + i * size,
        size / 2 + j * size,
        colorRect,
        size
      );
      rounds[i][j] = new Round(
        size / 2 + i * size,
        size / 2 + j * size,
        size,
        colorCirc
      );
      lines[i][j] = new StraightLine(
        size / 2 + i * size,
        size / 2 + j * size,
        colorRect,
        random(weights)
      );
    }
  }
}

function draw() {
  background(255);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      blocks[i][j].display();
      rounds[i][j].display();
      lines[i][j].display();
      lines[i][j].move();
    }
  }
}
