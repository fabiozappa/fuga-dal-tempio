// Texture procedurali generate su <canvas> — nessun file esterno (coerente col
// vincolo no-build / offline). Servono a dare "materia" alla pietra del tempio.

import * as THREE from 'three';

// Rumore + crepe + chiazze di muschio: una lastra di pietra della giungla.
export function makeStoneTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // Base pietra calda.
  ctx.fillStyle = '#9a8f7c';
  ctx.fillRect(0, 0, size, size);

  // Grana: rumore per-pixel.
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 46;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // Crepe scure a spezzata.
  ctx.strokeStyle = 'rgba(35, 30, 25, 0.55)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    let x = Math.random() * size, y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.5) * size * 0.4;
      y += (Math.random() - 0.5) * size * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Chiazze di muschio verde.
  for (let k = 0; k < 12; k++) {
    ctx.fillStyle = `rgba(74, 92, 48, ${0.12 + Math.random() * 0.28})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 11, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Terreno della giungla: terriccio scuro con foglie/muschio, per il piano sotto
// e attorno alla plancia.
export function makeGroundTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#1c2417';
  ctx.fillRect(0, 0, size, size);

  // Macchie di terra e fogliame.
  for (let k = 0; k < 240; k++) {
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
