// Shared MediaPipe Hands utilities for p5-based sketches.
// Assumes p5 global, and MediaPipe's Hands and Camera globals are available (via CDN tags).

export const FINGER_TIPS = {
  thumb: 4,
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20,
};

export const HAND_CONNECTIONS = [
  // wrist to thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  // wrist to index
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  // middle
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  // ring
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  // pinky
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

// Create (or reuse) a singleton Hands instance on window
export function getHandsInstance() {
  if (!window.hands) {
    window.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
  }
  return window.hands;
}

// Initialize hands options and register a results callback
export function initHands(opts = {}, onResults) {
  const hands = getHandsInstance();
  const defaults = {
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
    selfieMode: true,
  };
  hands.setOptions(Object.assign({}, defaults, opts));
  if (typeof onResults === "function") {
    hands.onResults(onResults);
  }
  return hands;
}

// Create a hidden capture and start MediaPipe Camera util
// Returns { videoElement, cam }
export function setupVideo(selfieMode = true, onFrame) {
  const videoElement = createCapture({ video: true, audio: false });
  // If p5 supports flipped capture via options, pass it here; fallback to manual mirroring in draw.
  videoElement.size(640, 480);
  videoElement.hide();

  const cam = new Camera(videoElement.elt, {
    onFrame: async () => {
      if (typeof onFrame === "function") {
        await onFrame(videoElement.elt);
      }
    },
    width: 640,
    height: 480,
  });
  cam.start();
  return { videoElement, cam };
}
