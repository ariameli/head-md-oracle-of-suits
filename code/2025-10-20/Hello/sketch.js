// ============================================================
//  Wiggle Things
//  A full-screen interactive sketch that creates
//  many small "Thing" objects that move randomly.
//
//  Demonstrates: classes, arrays (lists), and for...of loops
// ============================================================

// 1. Start with an empty list (array) to store all our Things
let things = [];

// 2. Define a "class" — a reusable blueprint for all Things
class Thing {
  // The constructor runs once when we create a new Thing
  constructor(x, y) {
    this.x = x; // remember this Thing's x position
    this.y = y; // remember this Thing's y position
  }

  // The draw() method describes what this Thing does each frame
  draw() {
    // random motion (small wiggle)
    this.x += random(-1, 1);
    this.y += random(-1, 1);

    // draw a circle representing this Thing
    circle(mouseX, mouseY, 50);
  }
}

// 3. setup() runs once at the beginning
function setup() {
  createCanvas(windowWidth, windowHeight); // full-window canvas
  noStroke(); // remove outlines
  fill(0); // black fill for circles
}

// 4. draw() runs about 60 times per second
function draw() {
  background(220); // light gray background (clears canvas each frame)

  // loop through all the Things in our list
  for (let t of things) {
    t.draw(); // tell each Thing to update and draw itself
  }
}

// 5. When the user clicks, add a new Thing to the list
function mousePressed() {
  // create a new Thing at the mouse position and add it to the list
  things.push(new Thing(mouseX, mouseY));
}

// 6. Resize the canvas if the window changes size
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
