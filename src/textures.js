import * as THREE from 'three';

// Color map for block palettes
export const COLOR_MAP = {
  rouge: { hex: 0xef4444, css: '#ef4444', label: 'Rouge' },
  bleu:  { hex: 0x3b82f6, css: '#3b82f6', label: 'Bleu' },
  vert:  { hex: 0x22c55e, css: '#22c55e', label: 'Vert' },
  jaune: { hex: 0xeab308, css: '#eab308', label: 'Jaune' }
};

const textureCache = new Map();

// Helper to draw pixelated blocks using HTML5 2D Canvas
function createBlockCanvas(type, colorName) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const baseColor = COLOR_MAP[colorName] ? COLOR_MAP[colorName].css : '#94a3b8';

  // Fill base background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, size, size);

  if (type === 'beton' || type === 'maison') {
    // Return high-definition 128x128 architectural concrete canvas
    return createConcreteFaceCanvas(colorName);
  } 
  else if (type === 'porte' || type === 'tour') {
    // Return high-definition 128x128 door front canvas
    return createDoorFrontCanvas(colorName, false);
  }
  else if (type === 'plante' || type === 'ferme') {
    // Return high-definition 128x128 botanical lush flowering canvas
    return createPlantTopCanvas(colorName);
  }
  else if (type === 'pont') {
    // Bridge fallback
    ctx.fillStyle = '#b45309';
    ctx.fillRect(4, 4, size - 8, size - 8);
    ctx.fillStyle = baseColor;
    ctx.fillRect(6, 26, size - 12, 12);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  }

  return canvas;
}

// Helper: High-definition door front & back canvas (128x128)
function createDoorFrontCanvas(colorName, isBack = false) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const baseColor = COLOR_MAP[colorName] ? COLOR_MAP[colorName].css : '#ef4444';

  // 1. Heavy Chamfered Wooden Outer Frame
  ctx.fillStyle = '#26160c'; // Deep dark oak frame
  ctx.fillRect(0, 0, size, size);

  // Beveled frame inner shadows & highlights
  ctx.fillStyle = '#170c06';
  ctx.fillRect(8, 8, size - 16, size - 16);

  // Frame corner 45° miters
  ctx.strokeStyle = '#0f0703';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(10, 10);
  ctx.moveTo(size, 0); ctx.lineTo(size - 10, 10);
  ctx.stroke();

  // Top frame iron studs
  ctx.fillStyle = '#0f172a';
  [24, 48, 80, 104].forEach(x => {
    ctx.beginPath();
    ctx.arc(x, 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 1, 4, 1.5, 1.5);
    ctx.fillStyle = '#0f172a';
  });

  // 2. Main Door Leaf (Warm Timber Planks)
  ctx.fillStyle = '#633311'; // Warm oak slab
  ctx.fillRect(10, 10, size - 20, size - 20);

  // Vertical timber grain & plank separation lines
  [38, 64, 90].forEach(px => {
    ctx.strokeStyle = '#2b1304';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, 10); ctx.lineTo(px, size - 10);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 2, 10); ctx.lineTo(px + 2, size - 10);
    ctx.stroke();
  });

  // Fine wood grain texture striations
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let i = 0; i < 40; i++) {
    const gx = 12 + ((i * 19) % 102);
    const gy = 12 + ((i * 37) % 102);
    ctx.fillRect(gx, gy, 1, 6 + (i % 8));
  }

  // 3. Upper Decorative Panel / Stained Glass Arch Window (y = 16 to 58)
  const winX = 20, winY = 16, winW = 88, winH = 42;
  // Recessed frame shadow
  ctx.fillStyle = '#1c0c04';
  ctx.fillRect(winX - 3, winY - 3, winW + 6, winH + 6);
  ctx.strokeStyle = '#42200a';
  ctx.lineWidth = 2;
  ctx.strokeRect(winX - 3, winY - 3, winW + 6, winH + 6);

  // Stained glass backing in dark crystal tone
  ctx.fillStyle = '#090d16';
  ctx.fillRect(winX, winY, winW, winH);

  // Colored stained glass glow
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(winX + 2, winY + 2, winW - 4, winH - 4);
  ctx.globalAlpha = 1.0;

  // Leaded diamond glass lattice
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  // Diagonal lines
  for (let d = -40; d < winW + 40; d += 22) {
    ctx.beginPath();
    ctx.moveTo(winX + d, winY);
    ctx.lineTo(winX + d + winH, winY + winH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(winX + d + winH, winY);
    ctx.lineTo(winX + d, winY + winH);
    ctx.stroke();
  }

  // Window frame inner beveled rim
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(winX + 1, winY + 1, winW - 2, winH - 2);

  // Glass diagonal sheen reflection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.moveTo(winX + 12, winY + winH - 2);
  ctx.lineTo(winX + 28, winY + winH - 2);
  ctx.lineTo(winX + 54, winY + 2);
  ctx.lineTo(winX + 38, winY + 2);
  ctx.closePath();
  ctx.fill();

  // 4. Lower Recessed Molded Panel (y = 66 to 116)
  const panX = 20, panY = 66, panW = 88, panH = 50;
  // Outer recessed shadow
  ctx.fillStyle = '#1c0c04';
  ctx.fillRect(panX - 2, panY - 2, panW + 4, panH + 4);

  // Panel background
  ctx.fillStyle = '#4a250a';
  ctx.fillRect(panX, panY, panW, panH);

  // Molded beveled rim
  ctx.strokeStyle = '#7c3f15';
  ctx.lineWidth = 2;
  ctx.strokeRect(panX + 2, panY + 2, panW - 4, panH - 4);

  // Inner beveled diamond / cross badge with subtle color accent
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(panX + panW / 2, panY + 8);
  ctx.lineTo(panX + panW - 14, panY + panH / 2);
  ctx.lineTo(panX + panW / 2, panY + panH - 8);
  ctx.lineTo(panX + 14, panY + panH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Central wooden medallion boss
  ctx.fillStyle = '#2b1304';
  ctx.beginPath();
  ctx.arc(panX + panW / 2, panY + panH / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(panX + panW / 2, panY + panH / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 5. Heavy Forged Iron Hinges (on left if front, on right if back)
  const hingeX = isBack ? (size - 18) : 6;
  [26, 96].forEach(hy => {
    // Hinge strap
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(hingeX, hy, 14, 10);
    // Knuckle
    ctx.beginPath();
    ctx.arc(isBack ? (size - 6) : 6, hy + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    // Steel rivets
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(hingeX + 3, hy + 3, 2, 2);
    ctx.fillRect(hingeX + 8, hy + 3, 2, 2);
  });

  // 6. Polished Brass Door Handle & Escutcheon (on right if front, on left if back)
  const handleX = isBack ? 22 : 94;
  const handleY = 68;

  // Escutcheon plate
  ctx.fillStyle = '#78350f'; // Plate shadow
  ctx.fillRect(handleX - 1, handleY - 1, 14, 30);
  ctx.fillStyle = '#ca8a04'; // Brass body
  ctx.fillRect(handleX, handleY, 12, 28);
  ctx.fillStyle = '#facc15'; // Brass highlight
  ctx.fillRect(handleX + 1, handleY + 1, 10, 26);

  // Plate top & bottom screws
  ctx.fillStyle = '#713f12';
  ctx.fillRect(handleX + 5, handleY + 3, 2, 2);
  ctx.fillRect(handleX + 5, handleY + 23, 2, 2);

  // Lever Handle
  ctx.fillStyle = '#0f172a'; // Handle shadow
  ctx.fillRect(isBack ? (handleX + 8) : (handleX - 14), handleY + 7, 16, 5);
  ctx.fillStyle = '#facc15'; // Handle metal
  ctx.fillRect(isBack ? (handleX + 6) : (handleX - 16), handleY + 6, 18, 5);
  ctx.fillStyle = '#fef08a'; // Specular sheen
  ctx.fillRect(isBack ? (handleX + 6) : (handleX - 16), handleY + 6, 18, 2);

  // Keyhole
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(handleX + 6, handleY + 16, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(handleX + 5, handleY + 16, 2, 4);

  // 7. Heavy Bottom Door Sill
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(6, size - 8, size - 12, 6);
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 1;
  ctx.strokeRect(6, size - 8, size - 12, 6);

  return canvas;
}

// Helper: Door Side Jamb Canvas (128x128)
function createDoorSideCanvas() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Solid vertical oak timber jamb
  ctx.fillStyle = '#3a1e0b';
  ctx.fillRect(0, 0, size, size);

  // Outer frame borders
  ctx.fillStyle = '#1a0c04';
  ctx.fillRect(0, 0, 10, size);
  ctx.fillRect(size - 10, 0, 10, size);

  // Vertical wood grain
  ctx.strokeStyle = '#241206';
  ctx.lineWidth = 2;
  for (let x = 16; x < size - 10; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Brass strike plate (mortise plate) at latch height
  const spX = 46, spY = 64, spW = 36, spH = 34;
  ctx.fillStyle = '#78350f';
  ctx.fillRect(spX - 2, spY - 2, spW + 4, spH + 4);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(spX, spY, spW, spH);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(spX + 2, spY + 2, spW - 4, spH - 4);

  // Center latch opening
  ctx.fillStyle = '#090d16';
  ctx.fillRect(spX + 10, spY + 9, spW - 20, 16);

  // Screws
  ctx.fillStyle = '#713f12';
  ctx.fillRect(spX + 6, spY + 4, 3, 3);
  ctx.fillRect(spX + spW - 9, spY + 4, 3, 3);
  ctx.fillRect(spX + 6, spY + spH - 7, 3, 3);
  ctx.fillRect(spX + spW - 9, spY + spH - 7, 3, 3);

  return canvas;
}

// Helper: Door Top & Bottom End-Grain Canvas (128x128)
function createDoorTopBottomCanvas() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark solid oak timber end-grain
  ctx.fillStyle = '#2f1809';
  ctx.fillRect(0, 0, size, size);

  // Frame bevels
  ctx.fillStyle = '#1a0c04';
  ctx.fillRect(0, 0, 10, size);
  ctx.fillRect(size - 10, 0, 10, size);
  ctx.fillRect(0, 0, size, 10);
  ctx.fillRect(0, size - 10, size, 10);

  // End-grain growth rings
  ctx.strokeStyle = '#45220c';
  ctx.lineWidth = 3;
  for (let r = 20; r < 90; r += 16) {
    ctx.beginPath();
    ctx.arc(64, 64, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Radiating timber ray checks
  ctx.strokeStyle = '#180c05';
  ctx.lineWidth = 1.5;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(a) * 15, 64 + Math.sin(a) * 15);
    ctx.lineTo(64 + Math.cos(a) * 55, 64 + Math.sin(a) * 55);
    ctx.stroke();
  }

  return canvas;
}

// Helper: High-definition architectural concrete face canvas (128x128)
function createConcreteFaceCanvas(colorName) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const baseHex = COLOR_MAP[colorName] ? COLOR_MAP[colorName].css : '#94a3b8';

  // Base frame background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // Pigmented architectural concrete slab with subtle lighting gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(4, 4, size - 8, size - 8);

  // Solid pigmented tint
  ctx.fillStyle = baseHex;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(4, 4, size - 8, size - 8);
  ctx.globalAlpha = 1.0;

  // Aggregate stone speckles (quartz & basalt inclusions)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  for (let i = 0; i < 70; i++) {
    const rx = 8 + ((i * 37) % 112);
    const ry = 8 + ((i * 53) % 112);
    const rw = (i % 3 === 0) ? 3 : 2;
    ctx.fillRect(rx, ry, rw, rw);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let i = 0; i < 70; i++) {
    const rx = 10 + ((i * 47) % 108);
    const ry = 10 + ((i * 29) % 108);
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Micro air-pores (bullage du béton banché)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  for (let i = 0; i < 24; i++) {
    const px = 14 + ((i * 61) % 100);
    const py = 14 + ((i * 73) % 100);
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizontal formwork joint seam (joint de banche)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, 64); ctx.lineTo(size - 4, 64);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(4, 66); ctx.lineTo(size - 4, 66);
  ctx.stroke();

  // 4 Formwork tie-rod cones (trous de banche architectoniques)
  const tieHoles = [
    [22, 22], [size - 22, 22],
    [22, size - 22], [size - 22, size - 22]
  ];
  tieHoles.forEach(([hx, hy]) => {
    // Outer shadow ring
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.arc(hx, hy, 9, 0, Math.PI * 2);
    ctx.fill();

    // Metallic conical chamfer
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(hx, hy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Inner dark hole
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Steel bolt highlight
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(hx - 1.5, hy - 1.5, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Beveled outer edges (chamfer highlights & shadows)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(2, size - 3); ctx.lineTo(2, 2); ctx.lineTo(size - 3, 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size - 3, 2); ctx.lineTo(size - 3, size - 3); ctx.lineTo(2, size - 3);
  ctx.stroke();

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  return canvas;
}

// Helper: Polished architectural concrete top canvas (128x128)
function createConcreteTopCanvas(colorName) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const baseHex = COLOR_MAP[colorName] ? COLOR_MAP[colorName].css : '#94a3b8';

  // Base background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // Polished slab
  ctx.fillStyle = baseHex;
  ctx.fillRect(4, 4, size - 8, size - 8);

  // Subtle marble / aggregate striations
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let i = 0; i < 50; i++) {
    const rx = 6 + ((i * 31) % 116);
    const ry = 6 + ((i * 41) % 116);
    ctx.fillRect(rx, ry, 3, 3);
  }

  // Cross expansion cut lines (joints de dilatation)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 4); ctx.lineTo(64, size - 4);
  ctx.moveTo(4, 64); ctx.lineTo(size - 4, 64);
  ctx.stroke();

  // Edge bevel
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, size - 10, size - 10);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  return canvas;
}

// Helper: Botanical lush flower bouquet top canvas (128x128)
function createPlantTopCanvas(colorName) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const baseHex = COLOR_MAP[colorName] ? COLOR_MAP[colorName].css : '#ef4444';

  // Deep foliage base
  ctx.fillStyle = '#0f381e';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#14532d';
  ctx.fillRect(4, 4, size - 8, size - 8);

  // Radiating foliage leaves
  const leaves = [
    [16, 16, 26, 20], [86, 14, 26, 22],
    [14, 88, 28, 22], [88, 86, 26, 24],
    [48, 8, 32, 22],  [48, 98, 32, 22],
    [8, 48, 22, 32],  [98, 48, 22, 32]
  ];
  ctx.fillStyle = '#16a34a';
  leaves.forEach(([lx, ly, lw, lh]) => {
    ctx.beginPath();
    ctx.ellipse(lx + lw / 2, ly + lh / 2, lw / 2, lh / 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#22c55e';
  leaves.forEach(([lx, ly, lw, lh]) => {
    ctx.beginPath();
    ctx.ellipse(lx + lw / 2, ly + lh / 2, lw / 3, lh / 3, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Central blossoming flower with layered petals in baseHex
  const cx = 64, cy = 64;
  const outerPetals = 8;
  const outerR = 24;
  ctx.fillStyle = baseHex;
  for (let i = 0; i < outerPetals; i++) {
    const angle = (i * Math.PI * 2) / outerPetals;
    const px = cx + Math.cos(angle) * outerR;
    const py = cy + Math.sin(angle) * outerR;
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Inner petal layer with highlight
  const innerR = 14;
  ctx.fillStyle = baseHex;
  for (let i = 0; i < outerPetals; i++) {
    const angle = ((i + 0.5) * Math.PI * 2) / outerPetals;
    const px = cx + Math.cos(angle) * innerR;
    const py = cy + Math.sin(angle) * innerR;
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden pollen core disk
  ctx.fillStyle = '#ca8a04';
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Dew drops
  [[52, 48], [76, 52], [54, 78]].forEach(([dx, dy]) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4 corner blooming flower buds
  [[24, 24], [104, 24], [24, 104], [104, 104]].forEach(([bx, by]) => {
    ctx.fillStyle = baseHex;
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Outer border
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  return canvas;
}

// Helper: Flowering botanical living wall side canvas (128x128)
function createPlantSideCanvas(colorName) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const baseHex = COLOR_MAP[colorName] ? COLOR_MAP[colorName].css : '#ef4444';

  // Deep hedge foliage
  ctx.fillStyle = '#0f381e';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#14532d';
  ctx.fillRect(4, 4, size - 8, size - 8);

  // Woody branches climbing up
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(34, 124); ctx.quadraticCurveTo(24, 64, 48, 20);
  ctx.moveTo(94, 124); ctx.quadraticCurveTo(104, 74, 80, 24);
  ctx.stroke();

  // Dense overlapping leaves
  ctx.fillStyle = '#15803d';
  for (let i = 0; i < 35; i++) {
    const lx = 8 + ((i * 29) % 108);
    const ly = 12 + ((i * 43) % 104);
    ctx.beginPath();
    ctx.ellipse(lx, ly, 10, 6, (i % 4) * (Math.PI / 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#22c55e';
  for (let i = 0; i < 25; i++) {
    const lx = 14 + ((i * 37) % 98);
    const ly = 18 + ((i * 47) % 94);
    ctx.beginPath();
    ctx.ellipse(lx, ly, 8, 4.5, (i % 3) * (Math.PI / 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // 3 Flowering blossoms on side
  const flowers = [
    [42, 38, 12],
    [86, 68, 11],
    [36, 96, 10]
  ];
  flowers.forEach(([fx, fy, fr]) => {
    ctx.fillStyle = baseHex;
    for (let a = 0; a < 6; a++) {
      const ang = (a * Math.PI * 2) / 6;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(ang) * (fr * 0.7), fy + Math.sin(ang) * (fr * 0.7), fr * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });

  // Border
  ctx.strokeStyle = '#166534';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  return canvas;
}

// Helper: Plant bottom soil canvas (128x128)
function createPlantBottomCanvas() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark moist loam soil
  ctx.fillStyle = '#241206';
  ctx.fillRect(0, 0, size, size);

  // Earth soil texture
  ctx.fillStyle = '#3a1f0d';
  for (let i = 0; i < 60; i++) {
    const sx = 4 + ((i * 33) % 120);
    const sy = 4 + ((i * 47) % 120);
    ctx.fillRect(sx, sy, 3, 3);
  }

  // Root fibers
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(12, 64); ctx.quadraticCurveTo(64, 48, 116, 64);
  ctx.moveTo(64, 12); ctx.quadraticCurveTo(74, 64, 64, 116);
  ctx.stroke();

  // Moss patches
  ctx.fillStyle = '#14532d';
  ctx.fillRect(18, 22, 16, 12);
  ctx.fillRect(84, 78, 18, 14);

  return canvas;
}

// Generate Three.js texture with pixelated filtering (Minecraft aesthetic)
export function getBlockTexture(type, colorName = 'rouge') {
  const key = `${type}_${colorName}`;
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }

  const canvas = createBlockCanvas(type, colorName);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  textureCache.set(key, texture);
  return texture;
}

// Generate 6-sided materials array for BoxGeometry
// Order in Three.js BoxGeometry: [+X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)]
export function getBlockMaterials(type, colorName = 'rouge') {
  const cacheKey = `mats_${type}_${colorName}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const makeTex = (cv) => {
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  if (type === 'porte' || type === 'tour') {
    // High-definition 6-sided door materials
    const frontCanvas = createDoorFrontCanvas(colorName, false);
    const backCanvas  = createDoorFrontCanvas(colorName, true);
    const sideCanvas  = createDoorSideCanvas();
    const topCanvas   = createDoorTopBottomCanvas();

    const frontTex = makeTex(frontCanvas);
    const backTex  = makeTex(backCanvas);
    const sideTex  = makeTex(sideCanvas);
    const topTex   = makeTex(topCanvas);

    const materials = [
      new THREE.MeshLambertMaterial({ map: sideTex, color: 0xffffff }),  // +X right
      new THREE.MeshLambertMaterial({ map: sideTex, color: 0xffffff }),  // -X left
      new THREE.MeshLambertMaterial({ map: topTex,  color: 0xffffff }),  // +Y top
      new THREE.MeshLambertMaterial({ map: topTex,  color: 0xffffff }),  // -Y bottom
      new THREE.MeshLambertMaterial({ map: frontTex, color: 0xffffff }), // +Z front
      new THREE.MeshLambertMaterial({ map: backTex,  color: 0xffffff })  // -Z back
    ];

    textureCache.set(cacheKey, materials);
    return materials;
  }

  if (type === 'beton' || type === 'maison') {
    // High-definition 6-sided architectural concrete materials
    const faceCanvas = createConcreteFaceCanvas(colorName);
    const topCanvas  = createConcreteTopCanvas(colorName);

    const faceTex = makeTex(faceCanvas);
    const topTex  = makeTex(topCanvas);

    const materials = [
      new THREE.MeshLambertMaterial({ map: faceTex, color: 0xffffff }),  // +X right
      new THREE.MeshLambertMaterial({ map: faceTex, color: 0xffffff }),  // -X left
      new THREE.MeshLambertMaterial({ map: topTex,  color: 0xffffff }),  // +Y top
      new THREE.MeshLambertMaterial({ map: topTex,  color: 0xffffff }),  // -Y bottom
      new THREE.MeshLambertMaterial({ map: faceTex, color: 0xffffff }),  // +Z front
      new THREE.MeshLambertMaterial({ map: faceTex, color: 0xffffff })   // -Z back
    ];

    textureCache.set(cacheKey, materials);
    return materials;
  }

  if (type === 'plante' || type === 'ferme') {
    // High-definition 6-sided botanical flowering hedge materials
    const topCanvas  = createPlantTopCanvas(colorName);
    const sideCanvas = createPlantSideCanvas(colorName);
    const botCanvas  = createPlantBottomCanvas();

    const topTex  = makeTex(topCanvas);
    const sideTex = makeTex(sideCanvas);
    const botTex  = makeTex(botCanvas);

    const materials = [
      new THREE.MeshLambertMaterial({ map: sideTex, color: 0xffffff }),  // +X right
      new THREE.MeshLambertMaterial({ map: sideTex, color: 0xffffff }),  // -X left
      new THREE.MeshLambertMaterial({ map: topTex,  color: 0xffffff }),  // +Y top
      new THREE.MeshLambertMaterial({ map: botTex,  color: 0xffffff }),  // -Y bottom
      new THREE.MeshLambertMaterial({ map: sideTex, color: 0xffffff }),  // +Z front
      new THREE.MeshLambertMaterial({ map: sideTex, color: 0xffffff })   // -Z back
    ];

    textureCache.set(cacheKey, materials);
    return materials;
  }

  // Fallback for other block types
  const singleTex = getBlockTexture(type, colorName);
  const mat = new THREE.MeshLambertMaterial({ map: singleTex, color: 0xffffff });
  const materials = [mat, mat, mat, mat, mat, mat];

  textureCache.set(cacheKey, materials);
  return materials;
}

// Generate terrain textures (North grass & South crystal grass)
export function createGrassTexture(isNorth = true) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (isNorth) {
    // Lush North grass (Minecraft green)
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, size, size);

    // Grass blade speckles
    ctx.fillStyle = '#16a34a';
    for (let i = 0; i < 60; i++) {
      const rx = Math.floor(Math.random() * size);
      const ry = Math.floor(Math.random() * size);
      ctx.fillRect(rx, ry, 3, 3);
    }
    // Subtle daisies
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 20, 3, 3);
    ctx.fillRect(44, 38, 3, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(17, 21, 1, 1);
    ctx.fillRect(45, 39, 1, 1);

    ctx.strokeStyle = 'rgba(21, 128, 61, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  } else {
    // Vibrant Azure South grass (Cyber / Sea / Crystal biome)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, size, size);

    // Glowing cyan speckles
    ctx.fillStyle = '#38bdf8';
    for (let i = 0; i < 60; i++) {
      const rx = Math.floor(Math.random() * size);
      const ry = Math.floor(Math.random() * size);
      ctx.fillRect(rx, ry, 3, 3);
    }
    // Crystal clusters
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(20, 15, 3, 3);
    ctx.fillRect(40, 45, 3, 3);

    ctx.strokeStyle = 'rgba(3, 105, 161, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Generate water texture for the dividing border river
export function createWaterTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#38bdf8';
  for (let y = 8; y < size; y += 16) {
    ctx.fillRect(0, y, size, 4);
  }

  ctx.fillStyle = '#bae6fd';
  for (let i = 0; i < 20; i++) {
    const rx = Math.floor(Math.random() * size);
    const ry = Math.floor(Math.random() * size);
    ctx.fillRect(rx, ry, 4, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Generate premium architectural pavement for Zone 3 (Grand Plateau Mégalopole)
export function createZone3Texture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Deep architectural slate base
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, size, size);

  // Marble tile quadrants
  ctx.fillStyle = '#334155';
  ctx.fillRect(3, 3, 27, 27);
  ctx.fillRect(34, 3, 27, 27);
  ctx.fillRect(3, 34, 27, 27);
  ctx.fillRect(34, 34, 27, 27);

  // Subtle marble flecks
  ctx.fillStyle = '#475569';
  for (let i = 0; i < 24; i++) {
    const rx = Math.floor(Math.random() * size);
    const ry = Math.floor(Math.random() * size);
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Golden builder grid lines & corner inlays
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 60, 60);

  ctx.strokeStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(32, 0); ctx.lineTo(32, size);
  ctx.moveTo(0, 32); ctx.lineTo(size, 32);
  ctx.stroke();

  // Golden central rosette / diamond
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(32, 28);
  ctx.lineTo(36, 32);
  ctx.lineTo(32, 36);
  ctx.lineTo(28, 32);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
