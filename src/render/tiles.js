// Tile della griglia + gemme dei power-up — Three.js.
// Legge lo snapshot del core e colora ogni casella secondo il suo stato.

import * as THREE from 'three';
import { cellKey } from '../core/grid.js';

// Colori per stato della casella (coerenti con debug.html).
const COLORS = {
  off:       0x161622, // spenta
  unlocked:  0x2f5d8f, // sbloccata (illuminata per tutto il round)
  path:      0x0e7c8a, // percorso rivelato (anteprima / rivelatore)
  power:     0xc99a2e, // casella con power-up rivelato
  collected: 0x264a63, // sbloccata, power-up già raccolto
  error:     0xc0392b, // lampeggio su casella sbagliata
};
const GEM_COLOR = 0xe8c04a;

export class TileGrid {
  constructor(spacing = 1) {
    this.group = new THREE.Group();
    this.spacing = spacing;
    this.width = 0;
    this.height = 0;
    this.tiles = new Map();   // key → mesh
    this.gems = [];           // { mesh, x, y }

    this.tileGeo = new THREE.BoxGeometry(0.9 * spacing, 0.2, 0.9 * spacing);
    this.gemGeo = new THREE.OctahedronGeometry(0.22 * spacing);
    this.gemMat = new THREE.MeshStandardMaterial({
      color: GEM_COLOR, emissive: GEM_COLOR, emissiveIntensity: 0.6, roughness: 0.3,
    });
  }

  // Posizione nel mondo di una casella (plancia centrata nell'origine).
  worldPos(x, y) {
    return new THREE.Vector3(
      (x - (this.width - 1) / 2) * this.spacing,
      0,
      (y - (this.height - 1) / 2) * this.spacing
    );
  }

  // (Ri)costruisce la griglia per le dimensioni date. Chiamata quando cambia H.
  build(width, height, powerUps) {
    // Pulisce la griglia precedente.
    for (const mesh of this.tiles.values()) {
      mesh.geometry = null;
      mesh.material.dispose();
      this.group.remove(mesh);
    }
    this.tiles.clear();
    for (const g of this.gems) this.group.remove(g.mesh);
    this.gems = [];

    this.width = width;
    this.height = height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const mat = new THREE.MeshStandardMaterial({
          color: COLORS.off, emissive: COLORS.off, emissiveIntensity: 0, roughness: 0.7,
        });
        const mesh = new THREE.Mesh(this.tileGeo, mat);
        const p = this.worldPos(x, y);
        mesh.position.set(p.x, -0.1, p.z); // faccia superiore a y=0
        this.tiles.set(cellKey(x, y), mesh);
        this.group.add(mesh);
      }
    }

    // Una gemma per ciascun power-up, in fondo al ramo cieco.
    for (const pu of powerUps) {
      const mesh = new THREE.Mesh(this.gemGeo, this.gemMat);
      const p = this.worldPos(pu.x, pu.y);
      mesh.position.set(p.x, 0.55, p.z);
      mesh.visible = false;
      this.gems.push({ mesh, x: pu.x, y: pu.y });
      this.group.add(mesh);
    }
  }

  // Aggiorna colori e gemme in base allo snapshot corrente.
  update(snap, now, errorFlash) {
    const puByKey = new Map(snap.powerUps.map((p) => [cellKey(p.x, p.y), p]));

    for (const [key, mesh] of this.tiles) {
      const unlocked = snap.unlocked.has(key);
      const isPath = snap.pathKeys.has(key);
      const pu = puByKey.get(key);

      let color = COLORS.off;
      let active = false;
      if (snap.reveal && isPath && !unlocked) { color = COLORS.path; active = true; }
      if (snap.reveal && pu && !pu.collected) { color = COLORS.power; active = true; }
      if (unlocked) { color = pu && pu.collected ? COLORS.collected : COLORS.unlocked; active = true; }
      if (errorFlash && errorFlash.key === key && now < errorFlash.until) {
        color = COLORS.error; active = true;
      }

      mesh.material.color.setHex(color);
      mesh.material.emissive.setHex(color);
      mesh.material.emissiveIntensity = active ? 0.4 : 0.0;
    }

    // Gemme visibili solo quando il percorso è rivelato e non ancora raccolte.
    for (const g of this.gems) {
      const pu = puByKey.get(cellKey(g.x, g.y));
      g.mesh.visible = snap.reveal && pu && !pu.collected;
      g.mesh.rotation.y = now * 0.002;
      g.mesh.position.y = 0.55 + Math.sin(now * 0.004) * 0.08;
    }
  }
}
