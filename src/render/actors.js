// Attori (giocatore e villain) — Three.js.
// Capsule low-poly: verde il giocatore, rosso il villain. In Fase 2 la
// posizione è impostata direttamente (nessuna interpolazione: è roba di Fase 5).

import * as THREE from 'three';

const PLAYER_COLOR = 0x2ecc71;
const VILLAIN_COLOR = 0xe74c3c;

function makeCapsule(color) {
  const geo = new THREE.CapsuleGeometry(0.26, 0.5, 4, 12);
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.25, roughness: 0.4,
  });
  return new THREE.Mesh(geo, mat);
}

export class Actors {
  constructor() {
    this.group = new THREE.Group();
    this.player = makeCapsule(PLAYER_COLOR);
    this.villain = makeCapsule(VILLAIN_COLOR);
    this.group.add(this.player, this.villain);
  }

  // Colloca le capsule sulle rispettive caselle. tileGrid fornisce worldPos.
  update(snap, tileGrid) {
    const standY = 0.52; // le capsule poggiano sopra il piano delle tile
    const p = tileGrid.worldPos(snap.player.x, snap.player.y);
    this.player.position.set(p.x, standY, p.z);

    const v = tileGrid.worldPos(snap.villain.x, snap.villain.y);
    this.villain.position.set(v.x, standY, v.z);
  }
}
