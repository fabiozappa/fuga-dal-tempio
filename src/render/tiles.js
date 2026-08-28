// Tile della griglia + gemme dei power-up — Three.js.
// Legge lo snapshot del core e colora ogni casella secondo il suo stato.

import * as THREE from 'three';
import { cellKey } from '../core/grid.js';
import { makeStoneTexture } from './textures.js';

// Tinte per stato della casella (tempio Inca). Il colore moltiplica la texture
// di pietra; l'emissione dà il "bagliore" alle caselle rivelate.
//  off       → pietra muschiata al buio (corridoio spento)
//  unlocked  → pietra illuminata dalla torcia (già percorsa)
//  path      → giada/turchese inciso (percorso corretto rivelato)
//  branch    → ambra (deviazione verso un power-up)
//  power     → oro (casella col power-up)
//  collected → pietra spenta (power-up già preso)
//  error     → cinabro (casella sbagliata)
const COLORS = {
  off:       0x3c453a,
  unlocked:  0xbb9a63,
  path:      0x2ec4b6,
  branch:    0xd08a34,
  power:     0xf2c744,
  collected: 0x5a5442,
  error:     0xc0392b,
};
const GEM_COLOR = 0xf5c542;

export class TileGrid {
  constructor(spacing = 1) {
    this.group = new THREE.Group();
    this.spacing = spacing;
    this.width = 0;
    this.height = 0;
    this.tiles = new Map();   // key → mesh
    this.gems = [];           // { mesh, x, y }

    this.stoneTex = makeStoneTexture();
    // Blocchi di pietra più massicci, con fuga (malta) tra l'uno e l'altro.
    this.tileGeo = new THREE.BoxGeometry(0.9 * spacing, 0.34, 0.9 * spacing);
    this.gemGeo = new THREE.OctahedronGeometry(0.2 * spacing);
    this.gemMat = new THREE.MeshStandardMaterial({
      color: GEM_COLOR, emissive: GEM_COLOR, emissiveIntensity: 0.7,
      roughness: 0.25, metalness: 0.6,
    });
  }

  // Posizione nel mondo di una casella (plancia centrata nell'origine).
  // L'asse x è specchiato (segno negativo) così che l'aumento della colonna di
  // gioco corrisponda alla destra dello schermo con la camera corrente.
  worldPos(x, y) {
    return new THREE.Vector3(
      -(x - (this.width - 1) / 2) * this.spacing,
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
          map: this.stoneTex, color: COLORS.off,
          emissive: COLORS.off, emissiveIntensity: 0, roughness: 0.9, metalness: 0.05,
        });
        const mesh = new THREE.Mesh(this.tileGeo, mat);
        const p = this.worldPos(x, y);
        mesh.position.set(p.x, -0.17, p.z); // faccia superiore a y=0
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

    // Pulsazione morbida per le caselle rivelate (anteprima / rivelatore): le
    // fa "respirare" così l'anteprima è viva invece che statica.
    const pulse = 0.7 + 0.3 * Math.sin(now * 0.006);

    for (const [key, mesh] of this.tiles) {
      const unlocked = snap.unlocked.has(key);
      const isPath = snap.pathKeys.has(key);
      const isBranch = snap.branchKeys.has(key);
      const pu = puByKey.get(key);

      let color = COLORS.off;
      let active = false;
      let revealed = false; // colorata dal "reveal" (pulsa), non da sblocco/errore
      if (snap.reveal && isPath && !unlocked) { color = COLORS.path; active = true; revealed = true; }
      if (snap.reveal && isBranch && !unlocked) { color = COLORS.branch; active = true; revealed = true; }
      if (snap.reveal && pu && !pu.collected) { color = COLORS.power; active = true; revealed = true; }
      if (unlocked) { color = pu && pu.collected ? COLORS.collected : COLORS.unlocked; active = true; revealed = false; }
      const isError = errorFlash && errorFlash.key === key && now < errorFlash.until;
      if (isError) { color = COLORS.error; active = true; revealed = false; }

      mesh.material.color.setHex(color);
      mesh.material.emissive.setHex(color);
      let intensity = active ? 0.3 : 0.0; // sblocco: bagliore torcia costante
      if (revealed) intensity = 0.55 * pulse; // rivelato: pulsa più marcato
      if (isError) intensity = 0.95; // lampeggio errore ben acceso
      mesh.material.emissiveIntensity = intensity;
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
