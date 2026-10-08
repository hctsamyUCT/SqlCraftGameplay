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
    // Concrete block (Béton) : Modern solid architectural concrete with tie holes and bevels
    ctx.fillStyle = baseColor;
    ctx.fillRect(4, 4, size - 8, size - 8);

    // Subtle aggregate speckles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 35; i++) {
      const rx = 6 + ((i * 17) % 52);
      const ry = 6 + ((i * 23) % 52);
      ctx.fillRect(rx, ry, 2, 2);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let i = 0; i < 35; i++) {
      const rx = 8 + ((i * 31) % 48);
      const ry = 8 + ((i * 19) % 48);
      ctx.fillRect(rx, ry, 2, 2);
    }

    // Concrete formwork seam line
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 32); ctx.lineTo(size - 4, 32);
    ctx.stroke();

    // 4 Formwork tie holes (architectural concrete look)
    const tieHoles = [
      [12, 12], [size - 12, 12],
      [12, size - 12], [size - 12, size - 12]
    ];
    tieHoles.forEach(([hx, hy]) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(hx - 1, hy - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Beveled edges
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, size - 2); ctx.lineTo(2, 2); ctx.lineTo(size - 2, 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size - 2, 2); ctx.lineTo(size - 2, size - 2); ctx.lineTo(2, size - 2);
    ctx.stroke();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  } 
  else if (type === 'porte' || type === 'tour') {
    // Door block (Porte) : Real recognizable wooden/steel door with frame, panels and golden knob
    ctx.fillStyle = '#334155'; // Outer frame
    ctx.fillRect(0, 0, size, size);

    // Inner door slab
    ctx.fillStyle = '#78350f'; // Rich timber
    ctx.fillRect(6, 6, size - 12, size - 12);

    // Vertical plank grooves
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    for (let x = 16; x < size - 8; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 6); ctx.lineTo(x, size - 6);
      ctx.stroke();
    }

    // Top recessed door panel with color accent
    ctx.fillStyle = baseColor;
    ctx.fillRect(10, 10, size - 20, 18);
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, size - 20, 18);

    // Bottom recessed door panel with color accent
    ctx.fillStyle = baseColor;
    ctx.fillRect(10, 34, size - 20, 20);
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 34, size - 20, 20);

    // Metallic hinges on left
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 14, 5, 8);
    ctx.fillRect(4, 44, 5, 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(5, 16, 2, 4);
    ctx.fillRect(5, 46, 2, 4);

    // Golden door knob & keyhole plate on right
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(42, 28, 8, 14);
    ctx.fillStyle = '#facc15'; // Golden knob
    ctx.beginPath();
    ctx.arc(46, 33, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a'; // Knob reflection
    ctx.fillRect(45, 31, 2, 2);
    ctx.fillStyle = '#000000'; // Keyhole
    ctx.fillRect(45, 38, 2, 3);

    // Heavy frame border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  }
  else if (type === 'plante' || type === 'ferme') {
    // Plant / Flower block (Plante / Fleur) : Lush foliage with vibrant colorful flowers
    ctx.fillStyle = '#14532d'; // Deep foliage
    ctx.fillRect(4, 4, size - 8, size - 8);

    // Leaves
    ctx.fillStyle = '#16a34a';
    const leaves = [
      [8, 12, 14, 10], [38, 8, 16, 12],
      [10, 40, 14, 12], [40, 42, 14, 10],
      [22, 24, 20, 18]
    ];
    leaves.forEach(([lx, ly, lw, lh]) => {
      ctx.beginPath();
      ctx.ellipse(lx + lw / 2, ly + lh / 2, lw / 2, lh / 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Central blooming flower with baseColor petals
    const cx = 32, cy = 32, r = 11;
    ctx.fillStyle = baseColor;
    const petalOffsets = [
      [0, -r], [r, 0], [0, r], [-r, 0],
      [-r * 0.7, -r * 0.7], [r * 0.7, -r * 0.7],
      [-r * 0.7, r * 0.7], [r * 0.7, r * 0.7]
    ];
    petalOffsets.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(cx + px, cy + py, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Golden pollen center
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // 2 small accent flower buds
    [[14, 14], [50, 50]].forEach(([bx, by]) => {
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(bx, by, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Nature border
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
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
