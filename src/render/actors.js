// Attori — Three.js. Modelli low-poly compositi (nessun asset esterno):
//  - giocatore: un esploratore/archeologo (cappello a tesa, zaino);
//  - villain:   un guardiano di pietra del tempio, con occhi luminosi.
// Le posizioni sono interpolate morbidamente tra una casella e l'altra.

import * as THREE from 'three';
import { SCREEN_RIGHT } from './camera.js';

// Costante di tempo dello smoothing (ms): più piccola = più scattante.
const TWEEN_TAU = 55;
const SEP = 0.18;      // sfasamento orizzontale per non sovrapporre le sagome
const STAND_Y = 0;     // i piedi poggiano sulla faccia superiore delle tile (y=0)

const EYE_COLOR = 0xffb020;        // occhi del guardiano
const EYE_FROZEN = 0x8fe4ff;       // occhi/ghiaccio quando è congelato (Gelo)
const STONE = 0x7c7a70;
const STONE_FROZEN = 0x9fc4d6;

function box(w, h, d, color, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.85, metalness: opts.metalness ?? 0.05,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
function at(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }

// --- Esploratore -----------------------------------------------------------
// Costruito coi piedi all'origine (y=0), rivolto verso la camera (lato -Z).
function makeExplorer() {
  const g = new THREE.Group();
  const CLOTH = 0xa8925a, PANTS = 0x4a3b28, SKIN = 0xd8a878, HAT = 0x5f4526, PACK = 0x6b4a24;

  g.add(at(box(0.12, 0.22, 0.13, PANTS), -0.08, 0.11, 0));
  g.add(at(box(0.12, 0.22, 0.13, PANTS), 0.08, 0.11, 0));
  g.add(at(box(0.34, 0.30, 0.20, CLOTH), 0, 0.37, 0));           // torso
  g.add(at(box(0.10, 0.26, 0.12, CLOTH), -0.22, 0.40, 0));       // braccia
  g.add(at(box(0.10, 0.26, 0.12, CLOTH), 0.22, 0.40, 0));
  g.add(at(box(0.26, 0.26, 0.12, PACK), 0, 0.40, 0.14));         // zaino (dietro)

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.7 })
  );
  g.add(at(head, 0, 0.64, 0));

  // Cappello: tesa + cupola.
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.21, 0.03, 20),
    new THREE.MeshStandardMaterial({ color: HAT, roughness: 0.85 })
  );
  g.add(at(brim, 0, 0.71, 0));
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.13, 0.13, 20),
    new THREE.MeshStandardMaterial({ color: HAT, roughness: 0.85 })
  );
  g.add(at(crown, 0, 0.78, 0));

  return { group: g, bodyMats: [], eyeMats: [] };
}

// --- Guardiano di pietra ---------------------------------------------------
function makeGuardian() {
  const g = new THREE.Group();
  const bodyMats = [];
  const push = (mesh) => { bodyMats.push(mesh.material); return mesh; };

  g.add(push(at(box(0.17, 0.30, 0.18, STONE), -0.12, 0.15, 0)));  // gambe
  g.add(push(at(box(0.17, 0.30, 0.18, STONE), 0.12, 0.15, 0)));
  g.add(push(at(box(0.46, 0.44, 0.30, STONE), 0, 0.52, 0)));      // busto
  g.add(push(at(box(0.15, 0.42, 0.17, STONE), -0.33, 0.52, 0)));  // braccia
  g.add(push(at(box(0.15, 0.42, 0.17, STONE), 0.33, 0.52, 0)));
  g.add(push(at(box(0.30, 0.26, 0.26, STONE), 0, 0.87, 0)));      // testa

  // Occhi luminosi sul fronte (lato -Z, verso la camera).
  const eyeMats = [];
  for (const ex of [-0.07, 0.07]) {
    const eye = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.05, 0.03),
      new THREE.MeshStandardMaterial({ color: EYE_COLOR, emissive: EYE_COLOR, emissiveIntensity: 1 })
    );
    at(eye, ex, 0.89, -0.14);
    eyeMats.push(eye.material);
    g.add(eye);
  }

  return { group: g, bodyMats, eyeMats };
}

export class Actors {
  constructor() {
    this.group = new THREE.Group();

    const player = makeExplorer();
    const villain = makeGuardian();
    this.player = player.group;
    this.villain = villain.group;
    this.villainBodyMats = villain.bodyMats;
    this.villainEyeMats = villain.eyeMats;

    this.group.add(this.player, this.villain);
    for (const root of [this.player, this.villain]) {
      root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    }
    this.snapNext = true; // al primo frame posiziona di scatto (niente scivolata)
  }

  reset() {
    this.snapNext = true;
  }

  moveToward(obj, tx, tz, dtMs) {
    if (this.snapNext) {
      obj.position.set(tx, STAND_Y, tz);
      return;
    }
    const a = 1 - Math.exp(-dtMs / TWEEN_TAU);
    obj.position.x += (tx - obj.position.x) * a;
    obj.position.z += (tz - obj.position.z) * a;
    obj.position.y = STAND_Y;
  }

  update(snap, tileGrid, dtMs) {
    const p = tileGrid.worldPos(snap.player.x, snap.player.y);
    this.moveToward(this.player, p.x + SCREEN_RIGHT.x * SEP, p.z + SCREEN_RIGHT.z * SEP, dtMs);

    const v = tileGrid.worldPos(snap.villain.x, snap.villain.y);
    this.moveToward(this.villain, v.x - SCREEN_RIGHT.x * SEP, v.z - SCREEN_RIGHT.z * SEP, dtMs);

    // Feedback del Gelo: la pietra del guardiano si vela di ghiaccio, gli occhi
    // passano da ambra a azzurro.
    const frozen = snap.timers.freezeMs > 0;
    const stone = frozen ? STONE_FROZEN : STONE;
    for (const m of this.villainBodyMats) m.color.setHex(stone);
    const eye = frozen ? EYE_FROZEN : EYE_COLOR;
    for (const m of this.villainEyeMats) { m.color.setHex(eye); m.emissive.setHex(eye); }

    this.snapNext = false;
  }
}
