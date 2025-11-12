export class GestureClassifier {
  constructor(opts = {}) {
    this.EXTENDED = opts.EXTENDED ?? 0.9;
    this.FOLDED = opts.FOLDED ?? 0.4;
    this.HAND_CONNECTIONS = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16],
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20],
    ];
  }
  _dist(a, b) {
    const dx = a.x - b.x,
      dy = a.y - b.y,
      dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  classify(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;
    const wrist = landmarks[0];
    const palmSize = this._dist(wrist, landmarks[9]);
    if (palmSize === 0) return null;
    const extended = [
      this._isFingerExtended(landmarks, 4, 2, wrist, palmSize),
      this._isFingerExtended(landmarks, 8, 6, wrist, palmSize),
      this._isFingerExtended(landmarks, 12, 10, wrist, palmSize),
      this._isFingerExtended(landmarks, 16, 14, wrist, palmSize),
      this._isFingerExtended(landmarks, 20, 18, wrist, palmSize),
    ];
    const count = extended.filter(Boolean).length;
    return count >= 3 ? "open" : "closed";
  }
  _isFingerExtended(landmarks, tipIdx, pipIdx, wrist, palmSize) {
    const tip = landmarks[tipIdx],
      pip = landmarks[pipIdx];
    const tipDist = this._dist(wrist, tip),
      pipDist = this._dist(wrist, pip);
    return tipDist - pipDist > palmSize * 0.3;
  }
  drawHands(landmarks, w = width, h = height) {
    stroke(0, 255, 0);
    strokeWeight(2);
    for (const [aI, bI] of this.HAND_CONNECTIONS) {
      const a = landmarks[aI],
        b = landmarks[bI];
      if (!a || !b) continue;
      line(a.x * w, a.y * h, b.x * w, b.y * h);
    }
    noStroke();
    fill(255, 0, 0);
    for (const lm of landmarks) {
      circle(lm.x * w, lm.y * h, 6);
    }
  }
  drawLabel(label, landmarks, w = width, h = height) {
    let minY = Infinity,
      minX = Infinity,
      maxX = -Infinity;
    for (const lm of landmarks) {
      const x = lm.x * w,
        y = lm.y * h;
      if (y < minY) minY = y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    const x = constrain((minX + maxX) / 2, 10, w - 10);
    const y = max(16, minY - 10);
    push();
    textAlign(CENTER, BOTTOM);
    textSize(20);
    stroke(0, 200);
    strokeWeight(6);
    fill(255);
    text(label, x, y);
    pop();
  }
}
