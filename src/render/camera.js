// Camera ortografica — Three.js. Legge solo dimensioni, non conosce il core.
// Il frustum si adatta all'aspect ratio garantendo che l'intera plancia — e
// quindi tutte le 6 colonne — resti sempre visibile.

import * as THREE from 'three';

// Orientamento della vista, in gradi. Con azimut 0 la vista è frontale: colonne
// orizzontali sullo schermo e traguardo dritto in alto, controlli leggibili.
// Alzando l'azimut si recupera un accenno di prospettiva isometrica (profondità
// sui lati delle caselle). L'elevazione è il pitch. Ritoccare qui per cambiare.
const AZIMUTH_DEG = 0;
const ELEVATION_DEG = 45;

const AZ = (AZIMUTH_DEG * Math.PI) / 180;
const EL = (ELEVATION_DEG * Math.PI) / 180;

// Direzione dalla plancia alla camera (azimut da -Z verso +X, elevazione su).
const ISO_DIR = new THREE.Vector3(
  Math.cos(EL) * Math.sin(AZ),
  Math.sin(EL),
  -Math.cos(EL) * Math.cos(AZ)
).normalize();

// Versore "destra dello schermo" nel mondo, dato l'azimut: serve agli attori
// per sfasarsi lungo l'orizzontale-schermo. (Deriva da cross(up, ISO_DIR).)
export const SCREEN_RIGHT = new THREE.Vector3(
  -Math.cos(AZ), 0, -Math.sin(AZ)
).normalize();

export function createCamera() {
  // Valori placeholder: verranno sovrascritti da fitCameraToBoard.
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  return cam;
}

// Adatta il frustum ortografico alla plancia centrata nell'origine.
//  board: { width, height, spacing }  aspect: larghezza/altezza viewport
//  pad:   margine in unità di mondo attorno alla plancia
export function fitCameraToBoard(cam, board, aspect, pad = 0.8) {
  const center = new THREE.Vector3(0, 0, 0);

  // Posizione isometrica (la distanza non cambia la scala in ortografica,
  // serve solo a stare dentro near/far e a definire la direzione).
  cam.position.copy(center).addScaledVector(ISO_DIR, 100);
  cam.up.set(0, 1, 0);
  cam.lookAt(center);
  cam.updateMatrixWorld();

  // Matrice di vista (mondo → spazio camera: x=destra, y=su, guardando -Z).
  const view = new THREE.Matrix4().copy(cam.matrixWorld).invert();

  // Proietto i quattro angoli della plancia (sul piano y=0) nello spazio camera.
  const hw = (board.width * board.spacing) / 2;
  const hh = (board.height * board.spacing) / 2;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = new THREE.Vector3(sx * hw, 0, sz * hh).applyMatrix4(view);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }

  // Semi-dimensioni necessarie a contenere la plancia (frustum centrato).
  let halfW = Math.max(maxX, -minX) + pad;
  let halfH = Math.max(maxY, -minY) + pad;

  // Rispetta l'aspect ratio del viewport allargando la dimensione più stretta.
  // Così la plancia (tutte le colonne) resta comunque interamente contenuta.
  if (halfW / halfH < aspect) halfW = halfH * aspect;
  else halfH = halfW / aspect;

  cam.left = -halfW;
  cam.right = halfW;
  cam.top = halfH;
  cam.bottom = -halfH;
  cam.near = 0.1;
  cam.far = 1000;
  cam.updateProjectionMatrix();
}
