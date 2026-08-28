// Rocce procedurali — Three.js. Massi irregolari (non cubi) generati deformando
// un icosaedro, con sfaccettature nette e muschio sulle facce rivolte in alto.
// Vengono sparse ATTORNO al sentiero, non sulle caselle calpestabili.

import * as THREE from 'three';
import { makeRockTexture } from './textures.js';

const rockTex = makeRockTexture();

// Un singolo masso. `r` = raggio medio; le deformazioni lo rendono unico.
export function makeRock(r = 0.5, rng = Math.random) {
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  // Deforma ogni vertice lungo la sua direzione: profilo irregolare.
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const f = 0.72 + rng() * 0.6; // 0.72–1.32 del raggio
    v.multiplyScalar(f);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  // Colore per-vertice: grigio variato + muschio verde sulle facce in su.
  const colors = [];
  const base = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const g = 0.42 + rng() * 0.18;
    base.setRGB(g, g * 0.98, g * 0.9);
    if (v.y > 0.35) { // muschio in cima
      const m = Math.min(1, (v.y - 0.35) * 1.4) * (0.5 + rng() * 0.5);
      base.r = base.r * (1 - m) + 0.28 * m;
      base.g = base.g * (1 - m) + 0.36 * m;
      base.b = base.b * (1 - m) + 0.16 * m;
    }
    colors.push(base.r, base.g, base.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, map: rockTex, bumpMap: rockTex, bumpScale: 0.05,
    roughness: 1, metalness: 0, flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  // Schiacciamento e rotazione casuali: massi non sferici.
  mesh.scale.set(1, 0.6 + rng() * 0.5, 1);
  mesh.rotation.set(rng() * 0.4, rng() * Math.PI * 2, rng() * 0.4);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Sparge rocce attorno a una plancia width×height (centrata nell'origine, con
// l'asse x specchiato come le tile). Ritorna un gruppo da aggiungere alla scena.
export function buildRocks(width, height, spacing, rng = Math.random) {
  const group = new THREE.Group();
  const halfW = (width * spacing) / 2;
  const halfH = (height * spacing) / 2;

  // Rocce lungo i due lati lunghi.
  for (let side of [-1, 1]) {
    for (let z = -halfH - 0.3; z <= halfH + 0.3; z += 0.9 + rng() * 0.8) {
      if (rng() < 0.28) continue; // qualche buco: distribuzione naturale
      const off = 0.5 + rng() * 0.9;
      const r = 0.28 + rng() * 0.45;
      const rock = makeRock(r, rng);
      rock.position.set(side * (halfW + off), -0.12 - rng() * 0.1, z + (rng() - 0.5) * 0.4);
      group.add(rock);
    }
  }

  // Qualche masso ai due estremi (partenza e traguardo).
  for (let end of [-1, 1]) {
    const n = 2 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const r = 0.3 + rng() * 0.5;
      const rock = makeRock(r, rng);
      rock.position.set((rng() - 0.5) * width * spacing, -0.12 - rng() * 0.1, end * (halfH + 0.5 + rng() * 0.8));
      group.add(rock);
    }
  }

  return group;
}
