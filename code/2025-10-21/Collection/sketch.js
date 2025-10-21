"use strict";

class Planet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  draw() {
    //wiggle the planet's position lightly
    this.x += random(-1, 1);
    this.y += random(-1, 1);
    fill(150, 0, 200);
    ellipse(this.x, this.y, 50, 50);
  }
}

let planets = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(100);
  for (let planet of planets) {
    planet.draw();
  }
}

function mousePressed() {
  let newPlanet = new Planet(mouseX, mouseY);
  planets.push(newPlanet);
}
