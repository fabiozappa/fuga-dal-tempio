// Texture procedurali generate su <canvas> — nessun file esterno (coerente col
// vincolo no-build / offline). Servono a dare "materia" alla pietra del tempio.

import * as THREE from 'three';

// Un blocco di pietra squadrato in stile bugnato Inca: giunto incassato tutto
// attorno, spigolo smussato (chiaro in alto-sinistra, scuro in basso-destra),
// grana, crepe, un'incisione a gradini e muschio. Usata sia come mappa colore
// sia come bump map, così la luce ne scolpisce il rilievo.
export function makeStoneTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const S = size;

  // Base pietra calda.
  ctx.fillStyle = '#a2937b';
  ctx.fillRect(0, 0, S, S);

  const joint = S * 0.09;       // larghezza del giunto (malta incassata)
  const cham = S * 0.07;        // larghezza dello smusso
  const i0 = joint, i1 = S - joint;           // riquadro interno (faccia del blocco)
  const c0 = joint + cham, c1 = S - joint - cham; // riquadro dopo lo smusso

  // Giunto incassato scuro tutto attorno.
  ctx.fillStyle = 'rgba(18, 14, 10, 0.7)';
  ctx.fillRect(0, 0, S, joint);
  ctx.fillRect(0, i1, S, joint);
  ctx.fillRect(0, 0, joint, S);
  ctx.fillRect(i1, 0, joint, S);

  // Faccia del blocco.
  ctx.fillStyle = '#a89a80';
  ctx.fillRect(i0, i0, i1 - i0, i1 - i0);

  // Smusso: luce in alto e a sinistra, ombra in basso e a destra.
  const bevel = (pts, style) => {
    ctx.fillStyle = style;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
    ctx.closePath();
    ctx.fill();
  };
  bevel([i0, i0, i1, i0, c1, c0, c0, c0], 'rgba(255, 244, 214, 0.30)'); // alto
  bevel([i0, i0, c0, c0, c0, c1, i0, i1], 'rgba(255, 244, 214, 0.18)'); // sinistra
  bevel([i1, i0, i1, i1, c1, c1, c1, c0], 'rgba(15, 11, 7, 0.34)');     // destra
  bevel([i0, i1, c0, c1, c1, c1, i1, i1], 'rgba(15, 11, 7, 0.42)');     // basso

  // Incisione a gradini (motivo andino) al centro della faccia.
  ctx.strokeStyle = 'rgba(25, 19, 13, 0.4)';
  ctx.lineWidth = Math.max(2, S * 0.012);
  const cx = S / 2, step = (c1 - c0) / 8;
  ctx.beginPath();
  ctx.moveTo(c0 + step, cx + step);
  ctx.lineTo(c0 + step, cx);
  ctx.lineTo(cx, cx);
  ctx.lineTo(cx, cx - step);
  ctx.lineTo(c1 - step, cx - step);
  ctx.stroke();

  // Grana: rumore per-pixel sull'intera lastra.
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let p = 0; p < d.length; p += 4) {
    const n = (Math.random() - 0.5) * 34;
    d[p] += n; d[p + 1] += n; d[p + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // Crepe scure a spezzata sulla faccia.
  ctx.strokeStyle = 'rgba(30, 24, 18, 0.6)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    let x = c0 + Math.random() * (c1 - c0), y = c0 + Math.random() * (c1 - c0);
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * S * 0.3;
      y += (Math.random() - 0.5) * S * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Chiazze di muschio verde.
  for (let k = 0; k < 16; k++) {
    ctx.fillStyle = `rgba(70, 92, 46, ${0.12 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, 4 + Math.random() * 14, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
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
