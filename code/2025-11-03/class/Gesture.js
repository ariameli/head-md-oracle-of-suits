export class GestureClassifier {
  constructor(opts = {}) {
    this.EXTENDED = opts.EXTENDED ?? 0.9;
    this.FOLDED = opts.FOLDED ?? 0.4; // Changed from 0.6 to 0.4

    this.HAND_CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20]
    ];
  }

  // helper: euclidean distance in 3D space
  _dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  classify(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;

    const wrist = landmarks[0];
    const palmSize = this._dist(wrist, landmarks[9]);
    
    if (palmSize === 0) return null;

    // Check if each finger is extended by comparing tip to MCP joint distance from palm
    const extendedFingers = [
      this._isFingerExtended(landmarks, 4, 2, wrist, palmSize),  // thumb
      this._isFingerExtended(landmarks, 8, 6, wrist, palmSize),  // index
      this._isFingerExtended(landmarks, 12, 10, wrist, palmSize), // middle
      this._isFingerExtended(landmarks, 16, 14, wrist, palmSize), // ring
      this._isFingerExtended(landmarks, 20, 18, wrist, palmSize)  // pinky
    ];

    const extendedCount = extendedFingers.filter(Boolean).length;

    // Open palm: 4 or 5 fingers extended
    // Closed fist: 0-2 fingers extended
    return extendedCount >= 3 ? 'open' : 'closed';
  }

  // Helper to check if a finger is extended
  _isFingerExtended(landmarks, tipIdx, pipIdx, wrist, palmSize) {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    
    // Distance from wrist to tip should be greater than wrist to PIP
    const tipDist = this._dist(wrist, tip);
    const pipDist = this._dist(wrist, pip);
    
    // Finger is extended if tip is significantly farther from wrist than PIP joint
    return (tipDist - pipDist) > (palmSize * 0.3);
  }

  // draw connections + landmarks using p5 globals (stroke, line, circle, etc.)
  drawHands(landmarks, w = width, h = height) {
    // connections
    stroke(0, 255, 0);
    strokeWeight(2);
    for (const pair of this.HAND_CONNECTIONS) {
      const a = landmarks[pair[0]];
      const b = landmarks[pair[1]];
      if (!a || !b) continue;
      const ax = a.x * w;
      const ay = a.y * h;
      const bx = b.x * w;
      const by = b.y * h;
      line(ax, ay, bx, by);
    }

    // landmarks
    noStroke();
    fill(255, 0, 0);
    for (const lm of landmarks) {
      const x = lm.x * w;
      const y = lm.y * h;
      circle(x, y, 6);
    }
  }

  drawLabel(label, landmarks, w = width, h = height) {
    let minY = Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const lm of landmarks) {
      const x = lm.x * w;
      const y = lm.y * h;
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