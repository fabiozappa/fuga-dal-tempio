// Attori (giocatore e villain) — Three.js.
// Capsule low-poly: verde il giocatore, rosso il villain. In Fase 2 la
// posizione è impostata direttamente (nessuna interpolazione: è roba di Fase 5).

import * as THREE from 'three';
import { SCREEN_RIGHT } from './camera.js';

const PLAYER_COLOR = 0x2ecc71;
const VILLAIN_COLOR = 0xe74c3c;

function makeCapsule(color) {
  const geo = new THREE.CapsuleGeometry(0.26, 0.5, 4, 12);
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.25, roughness: 0.4,
  });
  return new THREE.Mesh(geo, mat);
}

// Sfasamento lungo l'orizzontale-schermo (versore SCREEN_RIGHT dalla camera):
// tiene le due capsule distinte quando si trovano sulla stessa casella, senza
// spostarle in modo percepibile su caselle diverse.
const SEP = 0.18;
const SEP_DIR = SCREEN_RIGHT;

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
    this.player.position.set(
      p.x + SEP_DIR.x * SEP, standY, p.z + SEP_DIR.z * SEP
    );

    const v = tileGrid.worldPos(snap.villain.x, snap.villain.y);
    this.villain.position.set(
      v.x - SEP_DIR.x * SEP, standY, v.z - SEP_DIR.z * SEP
    );
  }
}
