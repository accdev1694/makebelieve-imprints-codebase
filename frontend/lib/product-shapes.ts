/**
 * Product Shape Renderers
 * Draws realistic product shapes on canvas for mockup previews
 */

export interface ShapeRenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface PrintAreaResult {
  x: number;
  y: number;
  width: number;
  height: number;
  clipPath?: Path2D;
  rotation?: number;
}

type ShapeRenderer = (context: ShapeRenderContext) => PrintAreaResult;

/**
 * Draw a mug shape
 */
function drawMug({ ctx, width, height, primaryColor, secondaryColor }: ShapeRenderContext): PrintAreaResult {
  const centerX = width / 2;
  const mugWidth = width * 0.5;
  const mugHeight = height * 0.6;
  const mugTop = height * 0.2;
  const mugLeft = centerX - mugWidth / 2 - width * 0.05;

  // Mug body shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.beginPath();
  ctx.ellipse(centerX + 5, mugTop + mugHeight, mugWidth / 2, mugHeight * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mug body
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.moveTo(mugLeft, mugTop);
  ctx.lineTo(mugLeft, mugTop + mugHeight * 0.9);
  ctx.quadraticCurveTo(mugLeft, mugTop + mugHeight, mugLeft + mugWidth * 0.1, mugTop + mugHeight);
  ctx.lineTo(mugLeft + mugWidth * 0.9, mugTop + mugHeight);
  ctx.quadraticCurveTo(mugLeft + mugWidth, mugTop + mugHeight, mugLeft + mugWidth, mugTop + mugHeight * 0.9);
  ctx.lineTo(mugLeft + mugWidth, mugTop);
  ctx.closePath();
  ctx.fill();

  // Mug rim highlight
  ctx.fillStyle = secondaryColor;
  ctx.beginPath();
  ctx.ellipse(mugLeft + mugWidth / 2, mugTop, mugWidth / 2, mugHeight * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner rim (dark)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(mugLeft + mugWidth / 2, mugTop, mugWidth / 2 - 5, mugHeight * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  // Handle
  const handleX = mugLeft + mugWidth;
  const handleY = mugTop + mugHeight * 0.2;
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = mugWidth * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(handleX, handleY);
  ctx.quadraticCurveTo(handleX + mugWidth * 0.4, handleY + mugHeight * 0.3, handleX, handleY + mugHeight * 0.5);
  ctx.stroke();

  // Handle highlight
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = mugWidth * 0.04;
  ctx.beginPath();
  ctx.moveTo(handleX + mugWidth * 0.08, handleY + mugHeight * 0.05);
  ctx.quadraticCurveTo(handleX + mugWidth * 0.35, handleY + mugHeight * 0.3, handleX + mugWidth * 0.08, handleY + mugHeight * 0.45);
  ctx.stroke();

  // Side highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.moveTo(mugLeft + mugWidth * 0.05, mugTop + mugHeight * 0.1);
  ctx.lineTo(mugLeft + mugWidth * 0.15, mugTop + mugHeight * 0.1);
  ctx.lineTo(mugLeft + mugWidth * 0.15, mugTop + mugHeight * 0.85);
  ctx.lineTo(mugLeft + mugWidth * 0.05, mugTop + mugHeight * 0.85);
  ctx.closePath();
  ctx.fill();

  // Print area
  const printX = mugLeft + mugWidth * 0.2;
  const printY = mugTop + mugHeight * 0.15;
  const printWidth = mugWidth * 0.6;
  const printHeight = mugHeight * 0.7;

  return { x: printX, y: printY, width: printWidth, height: printHeight };
}

/**
 * Draw a t-shirt shape
 */
function drawTShirt({ ctx, width, height, primaryColor, secondaryColor }: ShapeRenderContext): PrintAreaResult {
  const centerX = width / 2;
  const shirtWidth = width * 0.7;
  const shirtHeight = height * 0.75;
  const shirtTop = height * 0.12;
  const shirtLeft = centerX - shirtWidth / 2;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.beginPath();
  ctx.moveTo(shirtLeft + 8, shirtTop + shirtHeight * 0.15 + 5);
  ctx.lineTo(shirtLeft + 8, shirtTop + shirtHeight + 5);
  ctx.lineTo(shirtLeft + shirtWidth + 8, shirtTop + shirtHeight + 5);
  ctx.lineTo(shirtLeft + shirtWidth + 8, shirtTop + shirtHeight * 0.15 + 5);
  ctx.closePath();
  ctx.fill();

  // T-shirt body
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  // Left sleeve
  ctx.moveTo(shirtLeft - shirtWidth * 0.15, shirtTop + shirtHeight * 0.25);
  ctx.lineTo(shirtLeft, shirtTop + shirtHeight * 0.08);
  // Neck left
  ctx.lineTo(shirtLeft + shirtWidth * 0.35, shirtTop);
  // Neck curve
  ctx.quadraticCurveTo(centerX, shirtTop + shirtHeight * 0.08, shirtLeft + shirtWidth * 0.65, shirtTop);
  // Neck right
  ctx.lineTo(shirtLeft + shirtWidth, shirtTop + shirtHeight * 0.08);
  // Right sleeve
  ctx.lineTo(shirtLeft + shirtWidth + shirtWidth * 0.15, shirtTop + shirtHeight * 0.25);
  ctx.lineTo(shirtLeft + shirtWidth + shirtWidth * 0.15, shirtTop + shirtHeight * 0.35);
  ctx.lineTo(shirtLeft + shirtWidth, shirtTop + shirtHeight * 0.28);
  // Right side
  ctx.lineTo(shirtLeft + shirtWidth, shirtTop + shirtHeight);
  // Bottom
  ctx.lineTo(shirtLeft, shirtTop + shirtHeight);
  // Left side
  ctx.lineTo(shirtLeft, shirtTop + shirtHeight * 0.28);
  ctx.lineTo(shirtLeft - shirtWidth * 0.15, shirtTop + shirtHeight * 0.35);
  ctx.closePath();
  ctx.fill();

  // Collar
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(shirtLeft + shirtWidth * 0.35, shirtTop + 2);
  ctx.quadraticCurveTo(centerX, shirtTop + shirtHeight * 0.1, shirtLeft + shirtWidth * 0.65, shirtTop + 2);
  ctx.stroke();

  // Sleeve seams
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(shirtLeft, shirtTop + shirtHeight * 0.28);
  ctx.lineTo(shirtLeft, shirtTop + shirtHeight * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(shirtLeft + shirtWidth, shirtTop + shirtHeight * 0.28);
  ctx.lineTo(shirtLeft + shirtWidth, shirtTop + shirtHeight * 0.08);
  ctx.stroke();

  // Print area (chest area)
  const printX = shirtLeft + shirtWidth * 0.2;
  const printY = shirtTop + shirtHeight * 0.2;
  const printWidth = shirtWidth * 0.6;
  const printHeight = shirtHeight * 0.45;

  return { x: printX, y: printY, width: printWidth, height: printHeight };
}

/**
 * Draw a cushion/pillow shape
 */
function drawCushion({ ctx, width, height, primaryColor, secondaryColor }: ShapeRenderContext): PrintAreaResult {
  const centerX = width / 2;
  const centerY = height / 2;
  const cushionSize = Math.min(width, height) * 0.7;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.roundRect(centerX - cushionSize / 2 + 8, centerY - cushionSize / 2 + 8, cushionSize, cushionSize, cushionSize * 0.08);
  ctx.fill();

  // Cushion body
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.roundRect(centerX - cushionSize / 2, centerY - cushionSize / 2, cushionSize, cushionSize, cushionSize * 0.08);
  ctx.fill();

  // Edge seam
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(centerX - cushionSize / 2 + 8, centerY - cushionSize / 2 + 8, cushionSize - 16, cushionSize - 16, cushionSize * 0.06);
  ctx.stroke();

  // Fabric texture (subtle lines)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < cushionSize; i += 8) {
    ctx.beginPath();
    ctx.moveTo(centerX - cushionSize / 2 + i, centerY - cushionSize / 2);
    ctx.lineTo(centerX - cushionSize / 2 + i, centerY + cushionSize / 2);
    ctx.stroke();
  }

  // Corner puff effect
  const corners = [
    { x: centerX - cushionSize / 2 + cushionSize * 0.1, y: centerY - cushionSize / 2 + cushionSize * 0.1 },
    { x: centerX + cushionSize / 2 - cushionSize * 0.1, y: centerY - cushionSize / 2 + cushionSize * 0.1 },
    { x: centerX - cushionSize / 2 + cushionSize * 0.1, y: centerY + cushionSize / 2 - cushionSize * 0.1 },
    { x: centerX + cushionSize / 2 - cushionSize * 0.1, y: centerY + cushionSize / 2 - cushionSize * 0.1 },
  ];

  corners.forEach(corner => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, cushionSize * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });

  // Print area
  const printSize = cushionSize * 0.75;
  const printX = centerX - printSize / 2;
  const printY = centerY - printSize / 2;

  return { x: printX, y: printY, width: printSize, height: printSize };
}

/**
 * Draw a mousemat shape
 */
function drawMousemat({ ctx, width, height, primaryColor }: ShapeRenderContext): PrintAreaResult {
  const centerX = width / 2;
  const centerY = height / 2;
  const matWidth = width * 0.75;
  const matHeight = height * 0.55;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.roundRect(centerX - matWidth / 2 + 6, centerY - matHeight / 2 + 6, matWidth, matHeight, 8);
  ctx.fill();

  // Mousemat body
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.roundRect(centerX - matWidth / 2, centerY - matHeight / 2, matWidth, matHeight, 8);
  ctx.fill();

  // Rubber edge
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(centerX - matWidth / 2, centerY - matHeight / 2, matWidth, matHeight, 8);
  ctx.stroke();

  // Surface texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 50; i++) {
    const x = centerX - matWidth / 2 + Math.random() * matWidth;
    const y = centerY - matHeight / 2 + Math.random() * matHeight;
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Print area
  const printX = centerX - matWidth / 2 + matWidth * 0.05;
  const printY = centerY - matHeight / 2 + matHeight * 0.05;
  const printWidth = matWidth * 0.9;
  const printHeight = matHeight * 0.9;

  return { x: printX, y: printY, width: printWidth, height: printHeight };
}

/**
 * Draw a canvas print on wall
 */
function drawCanvasPrint({ ctx, width, height, primaryColor }: ShapeRenderContext): PrintAreaResult {
  // Wall background
  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(0, 0, width, height);

  // Wall texture
  ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
  for (let i = 0; i < 200; i++) {
    ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const canvasWidth = width * 0.6;
  const canvasHeight = height * 0.7;
  const depth = 15;

  // Canvas shadow on wall
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.moveTo(centerX - canvasWidth / 2 + 20, centerY - canvasHeight / 2 + 20);
  ctx.lineTo(centerX + canvasWidth / 2 + 20, centerY - canvasHeight / 2 + 20);
  ctx.lineTo(centerX + canvasWidth / 2 + 20, centerY + canvasHeight / 2 + 20);
  ctx.lineTo(centerX - canvasWidth / 2 + 20, centerY + canvasHeight / 2 + 20);
  ctx.closePath();
  ctx.fill();

  // Canvas side (depth effect)
  ctx.fillStyle = '#E0E0E0';
  // Right side
  ctx.beginPath();
  ctx.moveTo(centerX + canvasWidth / 2, centerY - canvasHeight / 2);
  ctx.lineTo(centerX + canvasWidth / 2 + depth, centerY - canvasHeight / 2 + depth);
  ctx.lineTo(centerX + canvasWidth / 2 + depth, centerY + canvasHeight / 2 + depth);
  ctx.lineTo(centerX + canvasWidth / 2, centerY + canvasHeight / 2);
  ctx.closePath();
  ctx.fill();
  // Bottom side
  ctx.fillStyle = '#D0D0D0';
  ctx.beginPath();
  ctx.moveTo(centerX - canvasWidth / 2, centerY + canvasHeight / 2);
  ctx.lineTo(centerX - canvasWidth / 2 + depth, centerY + canvasHeight / 2 + depth);
  ctx.lineTo(centerX + canvasWidth / 2 + depth, centerY + canvasHeight / 2 + depth);
  ctx.lineTo(centerX + canvasWidth / 2, centerY + canvasHeight / 2);
  ctx.closePath();
  ctx.fill();

  // Canvas front
  ctx.fillStyle = primaryColor;
  ctx.fillRect(centerX - canvasWidth / 2, centerY - canvasHeight / 2, canvasWidth, canvasHeight);

  // Canvas texture
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvasWidth; i += 4) {
    ctx.beginPath();
    ctx.moveTo(centerX - canvasWidth / 2 + i, centerY - canvasHeight / 2);
    ctx.lineTo(centerX - canvasWidth / 2 + i, centerY + canvasHeight / 2);
    ctx.stroke();
  }
  for (let i = 0; i < canvasHeight; i += 4) {
    ctx.beginPath();
    ctx.moveTo(centerX - canvasWidth / 2, centerY - canvasHeight / 2 + i);
    ctx.lineTo(centerX + canvasWidth / 2, centerY - canvasHeight / 2 + i);
    ctx.stroke();
  }

  // Print area
  const printX = centerX - canvasWidth / 2 + 5;
  const printY = centerY - canvasHeight / 2 + 5;
  const printWidth = canvasWidth - 10;
  const printHeight = canvasHeight - 10;

  return { x: printX, y: printY, width: printWidth, height: printHeight };
}

/**
 * Draw a poster in frame
 */
function drawPoster({ ctx, width, height, primaryColor }: ShapeRenderContext): PrintAreaResult {
  // Wall background
  ctx.fillStyle = '#E8E4DC';
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const frameWidth = width * 0.65;
  const frameHeight = height * 0.8;
  const frameBorder = 12;

  // Frame shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(centerX - frameWidth / 2 + 10, centerY - frameHeight / 2 + 10, frameWidth, frameHeight);

  // Frame outer
  ctx.fillStyle = '#2C2C2C';
  ctx.fillRect(centerX - frameWidth / 2, centerY - frameHeight / 2, frameWidth, frameHeight);

  // Frame inner (mat)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(
    centerX - frameWidth / 2 + frameBorder,
    centerY - frameHeight / 2 + frameBorder,
    frameWidth - frameBorder * 2,
    frameHeight - frameBorder * 2
  );

  // Poster area
  const posterMargin = 20;
  ctx.fillStyle = primaryColor;
  ctx.fillRect(
    centerX - frameWidth / 2 + frameBorder + posterMargin,
    centerY - frameHeight / 2 + frameBorder + posterMargin,
    frameWidth - frameBorder * 2 - posterMargin * 2,
    frameHeight - frameBorder * 2 - posterMargin * 2
  );

  // Glass reflection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.moveTo(centerX - frameWidth / 2, centerY - frameHeight / 2);
  ctx.lineTo(centerX - frameWidth / 2 + frameWidth * 0.3, centerY - frameHeight / 2);
  ctx.lineTo(centerX - frameWidth / 2, centerY - frameHeight / 2 + frameHeight * 0.3);
  ctx.closePath();
  ctx.fill();

  // Print area
  const printX = centerX - frameWidth / 2 + frameBorder + posterMargin + 5;
  const printY = centerY - frameHeight / 2 + frameBorder + posterMargin + 5;
  const printWidth = frameWidth - frameBorder * 2 - posterMargin * 2 - 10;
  const printHeight = frameHeight - frameBorder * 2 - posterMargin * 2 - 10;

  return { x: printX, y: printY, width: printWidth, height: printHeight };
}

/**
 * Draw a keychain shape
 */
function drawKeychain({ ctx, width, height, primaryColor, secondaryColor }: ShapeRenderContext): PrintAreaResult {
  const centerX = width / 2;
  const centerY = height / 2 + height * 0.05;
  const keychainSize = Math.min(width, height) * 0.4;

  // Chain/ring
  ctx.strokeStyle = '#C0C0C0';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(centerX, centerY - keychainSize / 2 - 25, 15, 0, Math.PI * 2);
  ctx.stroke();

  // Chain link
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - keychainSize / 2 - 10);
  ctx.lineTo(centerX, centerY - keychainSize / 2 + 5);
  ctx.stroke();

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.arc(centerX + 5, centerY + 5, keychainSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // Keychain body (circle)
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY, keychainSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // Edge
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, keychainSize / 2 - 5, 0, Math.PI * 2);
  ctx.stroke();

  // Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(centerX - keychainSize * 0.2, centerY - keychainSize * 0.2, keychainSize * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Print area (circular)
  const printRadius = keychainSize / 2 - 10;
  const clipPath = new Path2D();
  clipPath.arc(centerX, centerY, printRadius, 0, Math.PI * 2);

  return {
    x: centerX - printRadius,
    y: centerY - printRadius,
    width: printRadius * 2,
    height: printRadius * 2,
    clipPath,
  };
}

/**
 * Draw a water bottle shape
 */
function drawWaterBottle({ ctx, width, height, primaryColor, secondaryColor: _secondaryColor }: ShapeRenderContext): PrintAreaResult {
  const centerX = width / 2;
  const bottleWidth = width * 0.3;
  const bottleHeight = height * 0.75;
  const bottleTop = height * 0.1;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(centerX + 8, bottleTop + bottleHeight + 5, bottleWidth / 2, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bottle body
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.moveTo(centerX - bottleWidth / 2, bottleTop + bottleHeight * 0.15);
  ctx.lineTo(centerX - bottleWidth / 2, bottleTop + bottleHeight * 0.95);
  ctx.quadraticCurveTo(centerX - bottleWidth / 2, bottleTop + bottleHeight, centerX - bottleWidth / 3, bottleTop + bottleHeight);
  ctx.lineTo(centerX + bottleWidth / 3, bottleTop + bottleHeight);
  ctx.quadraticCurveTo(centerX + bottleWidth / 2, bottleTop + bottleHeight, centerX + bottleWidth / 2, bottleTop + bottleHeight * 0.95);
  ctx.lineTo(centerX + bottleWidth / 2, bottleTop + bottleHeight * 0.15);
  // Neck
  ctx.lineTo(centerX + bottleWidth / 4, bottleTop + bottleHeight * 0.1);
  ctx.lineTo(centerX + bottleWidth / 4, bottleTop + bottleHeight * 0.02);
  ctx.lineTo(centerX - bottleWidth / 4, bottleTop + bottleHeight * 0.02);
  ctx.lineTo(centerX - bottleWidth / 4, bottleTop + bottleHeight * 0.1);
  ctx.closePath();
  ctx.fill();

  // Cap
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.roundRect(centerX - bottleWidth / 4 - 3, bottleTop - 5, bottleWidth / 2 + 6, bottleHeight * 0.08, 3);
  ctx.fill();

  // Cap highlight
  ctx.fillStyle = '#555555';
  ctx.beginPath();
  ctx.roundRect(centerX - bottleWidth / 4, bottleTop - 3, bottleWidth / 2, bottleHeight * 0.03, 2);
  ctx.fill();

  // Bottle highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.moveTo(centerX - bottleWidth / 2 + 8, bottleTop + bottleHeight * 0.18);
  ctx.lineTo(centerX - bottleWidth / 2 + 15, bottleTop + bottleHeight * 0.18);
  ctx.lineTo(centerX - bottleWidth / 2 + 15, bottleTop + bottleHeight * 0.9);
  ctx.lineTo(centerX - bottleWidth / 2 + 8, bottleTop + bottleHeight * 0.9);
  ctx.closePath();
  ctx.fill();

  // Print area
  const printX = centerX - bottleWidth / 2 + bottleWidth * 0.15;
  const printY = bottleTop + bottleHeight * 0.2;
  const printWidth = bottleWidth * 0.7;
  const printHeight = bottleHeight * 0.5;

  return { x: printX, y: printY, width: printWidth, height: printHeight };
}

/**
 * Draw a business card shape
 */
function drawBusinessCard({ ctx, width, height, primaryColor }: ShapeRenderContext): PrintAreaResult {
  const centerX = width / 2;
  const centerY = height / 2;
  const cardWidth = width * 0.7;
  const cardHeight = cardWidth * 0.55; // Standard business card ratio

  // Stack effect - back cards
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-0.15);
  ctx.fillRect(-cardWidth / 2 + 15, -cardHeight / 2 + 15, cardWidth, cardHeight);
  ctx.restore();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-0.08);
  ctx.fillRect(-cardWidth / 2 + 8, -cardHeight / 2 + 8, cardWidth, cardHeight);
  ctx.restore();

  // Main card shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(centerX - cardWidth / 2 + 5, centerY - cardHeight / 2 + 5, cardWidth, cardHeight);

  // Main card
  ctx.fillStyle = primaryColor;
  ctx.fillRect(centerX - cardWidth / 2, centerY - cardHeight / 2, cardWidth, cardHeight);

  // Card edge
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(centerX - cardWidth / 2, centerY - cardHeight / 2, cardWidth, cardHeight);

  // Print area
  const printX = centerX - cardWidth / 2 + 10;
  const printY = centerY - cardHeight / 2 + 10;
  const printWidth = cardWidth - 20;
  const printHeight = cardHeight - 20;

  return { x: printX, y: printY, width: printWidth, height: printHeight };
}

/**
 * Draw a greeting card shape
 */
function drawGreetingCard({ ctx, width, height, primaryColor, secondaryColor }: ShapeRenderContext): PrintAreaResult {
  const centerX = width / 2;
  const cardWidth = width * 0.5;
  const cardHeight = height * 0.7;
  const cardTop = height * 0.15;
  const foldOffset = cardWidth * 0.1;

  // Back panel (left side of open card)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.save();
  ctx.translate(centerX - cardWidth / 2 - foldOffset, cardTop);
  ctx.transform(1, 0, -0.1, 1, 0, 0); // Slight skew
  ctx.fillRect(0, 0, cardWidth, cardHeight);
  ctx.restore();

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.moveTo(centerX - cardWidth / 2 + 8, cardTop + cardHeight + 5);
  ctx.lineTo(centerX + cardWidth / 2 + 8, cardTop + cardHeight + 5);
  ctx.lineTo(centerX + cardWidth / 2 + 8, cardTop + 5);
  ctx.lineTo(centerX - cardWidth / 2 + 8, cardTop + 5);
  ctx.closePath();
  ctx.fill();

  // Main card (right side - front)
  ctx.fillStyle = primaryColor;
  ctx.fillRect(centerX - cardWidth / 2, cardTop, cardWidth, cardHeight);

  // Fold line
  ctx.strokeStyle = secondaryColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(centerX - cardWidth / 2 + 5, cardTop + 10);
  ctx.lineTo(centerX - cardWidth / 2 + 5, cardTop + cardHeight - 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // Card texture
  ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
  for (let i = 0; i < 100; i++) {
    ctx.fillRect(
      centerX - cardWidth / 2 + Math.random() * cardWidth,
      cardTop + Math.random() * cardHeight,
      1, 1
    );
  }

  // Print area
  const printX = centerX - cardWidth / 2 + 15;
  const printY = cardTop + 15;
  const printWidth = cardWidth - 30;
  const printHeight = cardHeight - 30;

  return { x: printX, y: printY, width: printWidth, height: printHeight };
}

/**
 * Shape renderers by product type
 */
export const SHAPE_RENDERERS: Record<string, ShapeRenderer> = {
  MUG: drawMug,
  TSHIRT: drawTShirt,
  CUSHION_PILLOW: drawCushion,
  MOUSEMAT: drawMousemat,
  CANVAS_PRINT: drawCanvasPrint,
  POSTER: drawPoster,
  KEYCHAIN: drawKeychain,
  WATER_BOTTLE: drawWaterBottle,
  BUSINESS_CARD: drawBusinessCard,
  GREETING_CARD: drawGreetingCard,
};

/**
 * Get shape renderer for a product type
 */
export function getShapeRenderer(productType: string): ShapeRenderer | undefined {
  return SHAPE_RENDERERS[productType];
}

/**
 * Default colors for each product type
 */
export const PRODUCT_COLORS: Record<string, { primary: string; secondary: string }> = {
  MUG: { primary: '#FFFFFF', secondary: '#F0F0F0' },
  TSHIRT: { primary: '#FFFFFF', secondary: '#E8E8E8' },
  CUSHION_PILLOW: { primary: '#F8F8F8', secondary: '#E0E0E0' },
  MOUSEMAT: { primary: '#1A1A1A', secondary: '#333333' },
  CANVAS_PRINT: { primary: '#FFFFFF', secondary: '#F5F5F5' },
  POSTER: { primary: '#FFFFFF', secondary: '#F0F0F0' },
  KEYCHAIN: { primary: '#F5F5F5', secondary: '#E0E0E0' },
  WATER_BOTTLE: { primary: '#FFFFFF', secondary: '#E8E8E8' },
  BUSINESS_CARD: { primary: '#FFFFFF', secondary: '#F5F5F5' },
  GREETING_CARD: { primary: '#FFFEF5', secondary: '#F0EFE5' },
};
