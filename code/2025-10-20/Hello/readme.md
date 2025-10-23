# Pixel Replacing

This project is based on an example from the [Generative Design](http://www.generative-gestaltung.de/2/) book.

## Process

- Used the example's [code](https://editor.p5js.org/generative-design/sketches/P_4_3_1_02) from the book.

![image](./images/Screenshot%202025-10-23%20at%2014.42.47.png)

- Enabled the camera + some small tweaks

```
function setup() {
  createCanvas(600, 900);
  //image(img);
  capture = createCapture(VIDEO,{ flipped:true });
  capture.size(100, 180);
  capture.hide();
}
```

- made it work :))

![image](./images/Screenshot%202025-10-23%20at%2014.52.29.png)
