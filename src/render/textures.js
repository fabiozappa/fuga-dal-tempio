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

// Alone luminoso morbido (gradiente radiale bianco → trasparente). Va usato con
// blending additivo e tinta via SpriteMaterial.color.
export function makeGlowTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function iconCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.translate(size / 2, size / 2); // origine al centro, y negativo = su
  return { c, ctx };
}
function iconTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Cuore rosso (power-up Vita Extra).
export function makeHeartTexture(size = 128) {
  const { c, ctx } = iconCanvas(size);
  const w = size * 0.74, h = size * 0.66, top = -size * 0.22;
  ctx.beginPath();
  ctx.moveTo(0, top + h * 0.28);
  ctx.bezierCurveTo(0, top, -w / 2, top, -w / 2, top + h * 0.32);
  ctx.bezierCurveTo(-w / 2, top + h * 0.62, -w * 0.12, top + h * 0.85, 0, top + h);
  ctx.bezierCurveTo(w * 0.12, top + h * 0.85, w / 2, top + h * 0.62, w / 2, top + h * 0.32);
  ctx.bezierCurveTo(w / 2, top, 0, top, 0, top + h * 0.28);
  ctx.closePath();
  ctx.fillStyle = '#ff4d4d'; ctx.fill();
  ctx.lineWidth = size * 0.05; ctx.strokeStyle = '#8e1616'; ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-w * 0.16, top + h * 0.36, w * 0.1, h * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  return iconTexture(c);
}

// Fiocco di neve bianco (power-up Gelo).
export function makeSnowflakeTexture(size = 128) {
  const { c, ctx } = iconCanvas(size);
  const R = size * 0.42;
  ctx.strokeStyle = '#eef7ff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.045;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -R); ctx.stroke();
    for (const f of [0.55, 0.82]) {
      ctx.beginPath();
      ctx.moveTo(0, -R * f); ctx.lineTo(-R * 0.24, -R * f - R * 0.2);
      ctx.moveTo(0, -R * f); ctx.lineTo(R * 0.24, -R * f - R * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = '#eef7ff';
  ctx.beginPath(); ctx.arc(0, 0, size * 0.055, 0, Math.PI * 2); ctx.fill();
  return iconTexture(c);
}

// Maschera Inca gialla (power-up Rivelatore).
export function makeMaskTexture(size = 128) {
  const { c, ctx } = iconCanvas(size);
  const gold = '#f2c744', dark = '#5a3d12';
  ctx.lineWidth = size * 0.03; ctx.strokeStyle = dark;
  const fw = size * 0.52, fh = size * 0.6, r = size * 0.1;

  // Copricapo: banda a gradini in cima.
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.rect(-fw * 0.66, -fh / 2 - size * 0.17, fw * 1.32, size * 0.17);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = dark;
  for (let k = -2; k <= 2; k++) ctx.fillRect(k * size * 0.13 - size * 0.02, -fh / 2 - size * 0.13, size * 0.04, size * 0.09);

  // Volto (rettangolo stondato).
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(-fw / 2 + r, -fh / 2);
  ctx.lineTo(fw / 2 - r, -fh / 2);
  ctx.quadraticCurveTo(fw / 2, -fh / 2, fw / 2, -fh / 2 + r);
  ctx.lineTo(fw / 2, fh / 2 - r);
  ctx.quadraticCurveTo(fw / 2, fh / 2, fw / 2 - r, fh / 2);
  ctx.lineTo(-fw / 2 + r, fh / 2);
  ctx.quadraticCurveTo(-fw / 2, fh / 2, -fw / 2, fh / 2 - r);
  ctx.lineTo(-fw / 2, -fh / 2 + r);
  ctx.quadraticCurveTo(-fw / 2, -fh / 2, -fw / 2 + r, -fh / 2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Occhi, naso, bocca (scavati).
  ctx.fillStyle = dark;
  ctx.fillRect(-fw * 0.3, -fh * 0.16, fw * 0.2, fh * 0.11);
  ctx.fillRect(fw * 0.1, -fh * 0.16, fw * 0.2, fh * 0.11);
  ctx.beginPath();
  ctx.moveTo(0, -fh * 0.04); ctx.lineTo(-fw * 0.09, fh * 0.2); ctx.lineTo(fw * 0.09, fh * 0.2);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(-fw * 0.22, fh * 0.28, fw * 0.44, fh * 0.09);
  return iconTexture(c);
}

// Ali d'angelo bianche (power-up raro: supera il livello).
export function makeWingsTexture(size = 128) {
  const { c, ctx } = iconCanvas(size);

  // Una piuma: capsula appuntita in alto, ancorata al perno e ruotata.
  const feather = (px, py, ang, len, w) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(-w * 0.5, -len);
    ctx.quadraticCurveTo(0, -len - w * 0.7, w * 0.5, -len);
    ctx.lineTo(w, 0);
    ctx.quadraticCurveTo(0, w * 0.7, -w, 0);
    ctx.closePath();
    ctx.fillStyle = '#f6faff';
    ctx.fill();
    ctx.lineWidth = size * 0.012;
    ctx.strokeStyle = '#c7d4e8';
    ctx.stroke();
    ctx.restore();
  };

  const angs = [0.28, 0.6, 0.92, 1.2, 1.42];
  const lens = [0.30, 0.37, 0.42, 0.40, 0.32];
  const wing = (dir) => {
    const px = dir * size * 0.05, py = size * 0.06;
    for (let i = 0; i < angs.length; i++) {
      feather(px, py, dir * angs[i], size * lens[i], size * 0.05);
    }
  };
  wing(1);
  wing(-1);
  return iconTexture(c);
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
