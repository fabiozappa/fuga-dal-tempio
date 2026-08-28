// Texture procedurali generate su <canvas> — nessun file esterno (coerente col
// vincolo no-build / offline). Danno "materia" al sentiero di terra, alle rocce
// e al terreno della giungla.

import * as THREE from 'three';

function noise(ctx, size, amount) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// Sentiero: terra battuta con sassolini, radici e ciuffi di muschio.
export function makeEarthTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#6b5638';
  ctx.fillRect(0, 0, size, size);

  // Chiazze di terra più chiara/scura.
  for (let k = 0; k < 60; k++) {
    const t = Math.random();
    ctx.fillStyle = t < 0.5
      ? `rgba(90, 72, 46, ${0.15 + Math.random() * 0.3})`
      : `rgba(45, 35, 22, ${0.15 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 6 + Math.random() * 24, 0, Math.PI * 2);
    ctx.fill();
  }

  noise(ctx, size, 26);

  // Sassolini.
  for (let k = 0; k < 40; k++) {
    const g = 90 + Math.random() * 70;
    ctx.fillStyle = `rgba(${g}, ${g * 0.95}, ${g * 0.85}, 0.9)`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 1.5 + Math.random() * 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ciuffi di muschio/erba.
  for (let k = 0; k < 22; k++) {
    ctx.fillStyle = `rgba(70, 92, 42, ${0.2 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 3 + Math.random() * 9, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Roccia: granito grigio con minerali chiari/scuri, crepe e muschio in cima.
export function makeRockTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#7d7a72';
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 40);

  // Grani di minerale.
  for (let k = 0; k < 90; k++) {
    const light = Math.random() < 0.5;
    ctx.fillStyle = light ? 'rgba(200,196,186,0.5)' : 'rgba(40,38,34,0.5)';
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 0.8 + Math.random() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crepe.
  ctx.strokeStyle = 'rgba(30,28,24,0.5)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    let x = Math.random() * size, y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * size * 0.4;
      y += (Math.random() - 0.5) * size * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Terreno della giungla attorno: terriccio scuro con fogliame.
export function makeGroundTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#1c2417';
  ctx.fillRect(0, 0, size, size);

  for (let k = 0; k < 260; k++) {
    const g = 30 + Math.random() * 70;
    ctx.fillStyle = `rgba(${g * 0.5}, ${g}, ${g * 0.4}, ${0.15 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 9, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}
