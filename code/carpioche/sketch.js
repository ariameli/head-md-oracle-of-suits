let cards = [];
const NUMBER_OF_CARDS = 40;
const CARD_WIDTH = 100;
const CARD_HEIGHT = 150;
const CAMERA_WIDTH = 640;  // ou la taille souhaitée
const CAMERA_HEIGHT = 480; // ou la taille souhaitée
const TOUCH_DISTANCE = 30; // Distance threshold for finger interaction
const FRICTION = 0.98; // Augmenter la friction pour un mouvement plus fluide
const MOVEMENT_STRENGTH = 0.5; // Augmenter la force du mouvement
const ROTATION_STRENGTH = 0.02; // Nouvelle constante pour contrôler la rotation

// Ajouter ces constantes au début du fichier
const REPULSION_DISTANCE = 20; // Distance minimale entre les cartes
const REPULSION_FORCE = 0.5; // Force de répulsion
const HOLD_TIME = 2300; // Temps en millisecondes (2.3 secondes)
const GLOW_COLOR = [255, 215, 0]; // Couleur dorée pour le glow
const GLOW_SIZE = 200; // Taille du glow

let cardImages = []; // Tableau vide pour stocker les images
const cardImageNames = ['2bastos.png', '4bastos.png', '5bastos.png', '6bastos.png', '7bastos.png', '8bastos.png', 'Abastos.png', 'Cbastos.png', 'Rbastos.png', 'Sbastos.png'];
const card3ImageName = '3bastos.png';
let card3Image;

function preload() {
    // Charger toutes les images depuis le tableau cardImageNames
    for (let i = 0; i < cardImageNames.length; i++) {
        cardImages[i] = loadImage('card/' + cardImageNames[i]);
    }
    // Charger l'image spéciale du 3
    card3Image = loadImage('card/' + card3ImageName);
}

function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);
  setupHands();
  setupVideo();

  // Redimensionner l'élément vidéo
  videoElement.size(windowWidth, windowHeight);

  // D'abord créer la carte spéciale 3
  cards.push({
      x: width/2 - CARD_WIDTH/2,
      y: height/2 - CARD_HEIGHT/2,
      angle: random(TWO_PI),
      vx: 0,
      vy: 0,
      va: 0,
      isCard3: true, // Marquer comme carte spéciale
      isGlowing: false,
      touchStartTime: 0, // Ajouter le timer
      name: 'Card3'
  });

  // Puis créer les autres cartes
  for (let i = 0; i < NUMBER_OF_CARDS - 1; i++) {
      cards.push({
          x: random(width - CARD_WIDTH),
          y: random(height - CARD_HEIGHT),
          angle: random(TWO_PI), // Ajoute un angle aléatoire entre 0 et 2π
          vx: 0, // vélocité en x
          vy: 0, // vélocité en y
          va: 0, // vélocité angulaire
          isCard3: false,
          imageIndex: floor(random(cardImageNames.length)), // Utiliser la longueur du tableau cardImageNames
          name: `Card ${i + 1}`
      });
  }

}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
function draw() {
  background(0,0,0);
  if (isVideoReady()) {
  }
  strokeWeight(2);

  // make sure we have detections to draw
  if (detections) {
    for (let hand of detections.multiHandLandmarks) {
      drawIndex(hand);
      drawThumb(hand);
      drawTips(hand);
      drawConnections(hand);
      drawLandmarks(hand);

      let isTouchingCard3 = false; // Ajouter cette variable

      // Check for card interactions with finger tips
      for (let tipIndex of [4, 8, 12, 16, 20]) {
        let mark = hand[tipIndex];
        let fingerX = mark.x * videoElement.width;
        let fingerY = mark.y * videoElement.height;

        // Check each card
        for (let card of cards) {
          let cardCenterX = card.x + CARD_WIDTH/2;
          let cardCenterY = card.y + CARD_HEIGHT/2;

          if (distance(fingerX, fingerY, cardCenterX, cardCenterY) < TOUCH_DISTANCE) {
            // Calculer le vecteur de mouvement
            let dx = fingerX - cardCenterX;
            let dy = fingerY - cardCenterY;
            
            // Mettre à jour les vélocités
            card.vx = dx * MOVEMENT_STRENGTH;
            card.vy = dy * MOVEMENT_STRENGTH;
            card.va = (Math.atan2(dy, dx) - card.angle) * ROTATION_STRENGTH;
            
            if (card.isCard3) {
              isTouchingCard3 = true; // Marquer que la carte 3 est touchée
            }
          }
        }
      }
      // Gérer le timer de la carte 3 une seule fois par frame
      let card3 = cards.find(card => card.isCard3);
      if (card3) {
        if (isTouchingCard3) {
          if (card3.touchStartTime === 0) {
            card3.touchStartTime = millis();
          }
          let touchDuration = millis() - card3.touchStartTime;
          if (touchDuration >= HOLD_TIME) {
            card3.isGlowing = true;
          }
        } else {
          card3.touchStartTime = 0;
        }
      }
    } 
  }
  drawCards();
} 


function drawIndex(landmarks) {

  // get the index fingertip landmark
  let mark = landmarks[FINGER_TIPS.index];

  noStroke();
  // set fill color for index fingertip good 
 fill(255, 255, 255);

  // adapt the coordinates (0..1) to video coordinates
  let x = mark.x * videoElement.width;
  let y = mark.y * videoElement.height;
  circle(x, y, 10);

}
function drawThumb(landmarks) {

  // get the thumb fingertip landmark
  let mark = landmarks[FINGER_TIPS.thumb];

  noStroke();
  // set fill color for thumb fingertip good too
  fill(255, 255,255);

  // adapt the coordinates (0..1) to video coordinates
  let x = mark.x * videoElement.width;
  let y = mark.y * videoElement.height;
  circle(x, y, 5);

}
function drawTips(landmarks) {

  noStroke();
  // set fill color for fingertips
  fill(255, 255, 255);

  // fingertip indices
  const tips = [4, 8, 12, 16, 20];

  for (let tipIndex of tips) {
    let mark = landmarks[tipIndex];
    // adapt the coordinates (0..1) to video coordinates
    let x = mark.x * videoElement.width;
    let y = mark.y * videoElement.height;
    circle(x, y, 0);
  }

}
function drawLandmarks(landmarks) {

  noStroke();
  // set fill color for landmarks
  fill(255, 255, 255);

  for (let mark of landmarks) {
    // adapt the coordinates (0..1) to video coordinates
    let x = mark.x * videoElement.width;
    let y = mark.y * videoElement.height;
    circle(x, y, 0);
  }

}
function drawConnections(landmarks) {

  // set stroke color for connections
  stroke(255, 255, 255);
  // epaisseur des lignes
  strokeWeight(6);

  // iterate through each connection
  for (let connection of HAND_CONNECTIONS) {
    // get the two landmarks to connect
    const a = landmarks[connection[0]];
    const b = landmarks[connection[1]];
    // skip if either landmark is missing
    if (!a || !b) continue;
    // landmarks are normalized [0..1], (x,y) with origin top-left
    let ax = a.x * videoElement.width;
    let ay = a.y * videoElement.height;
    let bx = b.x * videoElement.width;
    let by = b.y * videoElement.height;
    line(ax, ay, bx, by);
  }
}


  // Fonction pour dessiner les cartes
function drawCards() {
    // Appliquer la répulsion avant de dessiner
    applyRepulsion();
    
    imageMode(CENTER);
    for (let card of cards) {
        // Appliquer la vélocité
        card.x += card.vx;
        card.y += card.vy;
        card.angle += card.va * 0.5; // Réduire encore plus l'effet de rotation
        // Appliquer la friction
        card.vx *= FRICTION;
        card.vy *= FRICTION;
        card.va *= FRICTION;
        
        // Garder les cartes dans les limites
        card.x = constrain(card.x, 0, width - CARD_WIDTH);
        card.y = constrain(card.y, 0, height - CARD_HEIGHT);
        
        // Rebondir sur les bords
        if (card.x <= 0 || card.x >= width - CARD_WIDTH) card.vx *= -0.5;
        if (card.y <= 0 || card.y >= height - CARD_HEIGHT) card.vy *= -0.5;

        push();
        translate(card.x + CARD_WIDTH/2, card.y + CARD_HEIGHT/2);
        rotate(card.angle);
        
        if (card.isCard3) {
            // Appliquer le glow si activé
            if (card.isGlowing) {
                drawingContext.shadowBlur = GLOW_SIZE;
                drawingContext.shadowColor = `rgb(${GLOW_COLOR[0]}, ${GLOW_COLOR[1]}, ${GLOW_COLOR[2]})`;
            }
            
            // Dessiner la carte
            image(card3Image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
            
            // Réinitialiser le glow
            drawingContext.shadowBlur = 0;
        } else if (cardImages[card.imageIndex]) {
            // Dessiner les autres cartes
            image(cardImages[card.imageIndex], 0, 0, CARD_WIDTH, CARD_HEIGHT);
        }
        
        pop();
    }
}

// Ajouter cette nouvelle fonction après drawCards()
function applyRepulsion() {
    for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
            let card1 = cards[i];
            let card2 = cards[j];
            
            // Calculer le centre des cartes
            let center1X = card1.x + CARD_WIDTH/2;
            let center1Y = card1.y + CARD_HEIGHT/2;
            let center2X = card2.x + CARD_WIDTH/2;
            let center2Y = card2.y + CARD_HEIGHT/2;
            
            // Calculer la distance entre les centres
            let dist = distance(center1X, center1Y, center2X, center2Y);
            
            if (dist < REPULSION_DISTANCE) {
                // Calculer la direction de répulsion
                let dx = center2X - center1X;
                let dy = center2Y - center1Y;
                let angle = Math.atan2(dy, dx);
                
                // Calculer la force de répulsion (plus forte quand plus proche)
                let force = (REPULSION_DISTANCE - dist) * REPULSION_FORCE;
                
                // Appliquer la répulsion aux deux cartes dans des directions opposées
                card1.vx -= Math.cos(angle) * force;
                card1.vy -= Math.sin(angle) * force;
                card2.vx += Math.cos(angle) * force;
                card2.vy += Math.sin(angle) * force;
            }
        }
    }
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}