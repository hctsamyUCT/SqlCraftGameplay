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

  if (type === 'maison') {
    // House / Cottage: Bricks, timber frame & roof accent
    ctx.fillStyle = baseColor;
    ctx.fillRect(4, 4, size - 8, size - 8);

    // Brick pattern
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let y = 8; y < size - 8; y += 12) {
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(size - 4, y);
      ctx.stroke();

      const offset = (y % 24 === 8) ? 0 : 8;
      for (let x = 4 + offset; x < size - 8; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 12);
        ctx.stroke();
      }
    }

    // Cozy central window
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(22, 22, 20, 20);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(24, 24, 16, 16);
    // Window cross
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(32, 24); ctx.lineTo(32, 40);
    ctx.moveTo(24, 32); ctx.lineTo(40, 32);
    ctx.stroke();

    // Wooden timber border
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  } 
  else if (type === 'tour') {
    // Castle Tower: Heavy stone masonry with arrow slit and battlements
    ctx.fillStyle = '#64748b';
    ctx.fillRect(4, 4, size - 8, size - 8);

    // Stone blocks
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    for (let y = 6; y < size - 6; y += 14) {
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(size - 4, y);
      ctx.stroke();

      const offset = (y % 28 === 6) ? 0 : 12;
      for (let x = 4 + offset; x < size - 6; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 14);
        ctx.stroke();
      }
    }

    // Color banner accent
    ctx.fillStyle = baseColor;
    ctx.fillRect(16, 8, 32, 14);

    // Vertical arrow slit
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(29, 28, 6, 20);

    // Outer stone frame
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  }
  else if (type === 'ferme') {
    // Farmland: Rich soil, crops / golden wheat & wood edge
    ctx.fillStyle = '#78350f'; // Rich earth
    ctx.fillRect(4, 4, size - 8, size - 8);

    // Farmland furrows
    ctx.fillStyle = '#451a03';
    for (let y = 10; y < size - 10; y += 12) {
      ctx.fillRect(6, y, size - 12, 4);
    }

    // Wheat stalks / crops (colored accents)
    ctx.fillStyle = baseColor;
    for (let x = 12; x < size - 12; x += 14) {
      for (let y = 10; y < size - 12; y += 14) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a'; // golden grain tips
        ctx.fillRect(x - 1, y - 5, 2, 4);
        ctx.fillStyle = baseColor;
      }
    }

    // Wooden planter border
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 5;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  }
  else if (type === 'pont') {
    // Bridge: Wooden planks with iron bolts and colored heraldry
    ctx.fillStyle = '#b45309';
    ctx.fillRect(4, 4, size - 8, size - 8);

    // Horizontal wooden planks
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    for (let y = 16; y < size; y += 16) {
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(size - 4, y);
      ctx.stroke();
    }

    // Center color stripe
    ctx.fillStyle = baseColor;
    ctx.fillRect(6, 26, size - 12, 12);

    // Iron corner bolts
    ctx.fillStyle = '#cbd5e1';
    [10, size - 10].forEach(bx => {
      [10, size - 10].forEach(by => {
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Dark rustic frame
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
