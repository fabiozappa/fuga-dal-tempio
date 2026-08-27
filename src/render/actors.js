// Attori (giocatore e villain) — Three.js.
// Capsule low-poly: verde il giocatore, rosso il villain. Le posizioni sono
// interpolate morbidamente tra una casella e l'altra (smoothing esponenziale,
// indipendente dal frame rate) invece di saltare di scatto.

import * as THREE from 'three';
import { SCREEN_RIGHT } from './camera.js';

const PLAYER_COLOR = 0x2ecc71;
const VILLAIN_COLOR = 0xe74c3c;
const VILLAIN_FROZEN_COLOR = 0x6fc7e0; // tinta ghiaccio quando è congelato (Gelo)

// Costante di tempo dello smoothing (ms): più piccola = più scattante.
const TWEEN_TAU = 55;

function makeCapsule(color) {
  const geo = new THREE.CapsuleGeometry(0.26, 0.5, 4, 12);
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.25, roughness: 0.4,
  });
  return new THREE.Mesh(geo, mat);
}

// Sfasamento lungo l'orizzontale-schermo (versore SCREEN_RIGHT dalla camera):
// tiene le due capsule distinte quando si trovano sulla stessa casella.
const SEP = 0.18;
const STAND_Y = 0.52; // altezza a cui poggiano le capsule sopra le tile

export class Actors {
  constructor() {
    this.group = new THREE.Group();
    this.player = makeCapsule(PLAYER_COLOR);
    this.villain = makeCapsule(VILLAIN_COLOR);
    this.group.add(this.player, this.villain);
    this.snapNext = true; // al primo frame posiziona di scatto (niente scivolata)
  }

  // Da chiamare quando cambia il livello: la prossima update posiziona senza
  // interpolare (niente scivolata dall'origine o attraverso la plancia).
  reset() {
    this.snapNext = true;
  }

  // Interpolazione esponenziale verso il bersaglio, stabile a qualsiasi frame rate.
  moveToward(mesh, tx, tz, dtMs) {
    if (this.snapNext) {
      mesh.position.set(tx, STAND_Y, tz);
      return;
    }
    const a = 1 - Math.exp(-dtMs / TWEEN_TAU);
    mesh.position.x += (tx - mesh.position.x) * a;
    mesh.position.z += (tz - mesh.position.z) * a;
    mesh.position.y = STAND_Y;
  }

  update(snap, tileGrid, dtMs) {
    const p = tileGrid.worldPos(snap.player.x, snap.player.y);
    this.moveToward(this.player, p.x + SCREEN_RIGHT.x * SEP, p.z + SCREEN_RIGHT.z * SEP, dtMs);

    const v = tileGrid.worldPos(snap.villain.x, snap.villain.y);
    this.moveToward(this.villain, v.x - SCREEN_RIGHT.x * SEP, v.z - SCREEN_RIGHT.z * SEP, dtMs);

    // Feedback del Gelo: il villain diventa color ghiaccio finché è congelato.
    const frozen = snap.timers.freezeMs > 0;
    const tint = frozen ? VILLAIN_FROZEN_COLOR : VILLAIN_COLOR;
    this.villain.material.color.setHex(tint);
    this.villain.material.emissive.setHex(tint);
    this.villain.material.emissiveIntensity = frozen ? 0.5 : 0.25;

    this.snapNext = false;
  }
}
