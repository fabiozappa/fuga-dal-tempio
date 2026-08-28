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
// Idolo Inca scolpito: pietra sfaccettata, copricapo con oro, collana ed emblema
// dorati, occhi luminosi. Rivolto verso la camera (lato -Z). Feet a y=0.
function makeGuardian() {
  const g = new THREE.Group();

  // Materiali condivisi (uno per famiglia): efficienti e facili da tinteggiare.
  const stone = new THREE.MeshStandardMaterial({ color: STONE, roughness: 1, metalness: 0.02, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x33302a, roughness: 1, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a94a, emissive: 0x4a3410, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.7 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: EYE_COLOR, emissive: EYE_COLOR, emissiveIntensity: 1 });

  const add = (mat, w, h, d, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    g.add(m);
    return m;
  };

  add(stone, 0.16, 0.32, 0.18, -0.12, 0.16, 0);   // gambe
  add(stone, 0.16, 0.32, 0.18, 0.12, 0.16, 0);
  add(stone, 0.50, 0.44, 0.30, 0, 0.54, 0);       // busto
  add(stone, 0.16, 0.44, 0.18, -0.35, 0.50, 0);   // braccia
  add(stone, 0.16, 0.44, 0.18, 0.35, 0.50, 0);
  add(stone, 0.22, 0.12, 0.28, -0.35, 0.75, 0);   // spalliere
  add(stone, 0.22, 0.12, 0.28, 0.35, 0.75, 0);

  add(gold, 0.38, 0.05, 0.06, 0, 0.72, -0.15);    // collana
  add(gold, 0.14, 0.14, 0.06, 0, 0.56, -0.16);    // emblema sul petto

  add(stone, 0.16, 0.09, 0.16, 0, 0.79, 0);       // collo
  add(stone, 0.34, 0.30, 0.28, 0, 0.98, 0);       // testa
  add(stone, 0.34, 0.06, 0.06, 0, 1.03, -0.12);   // arcata sopraccigliare
  add(dark, 0.18, 0.05, 0.05, 0, 0.89, -0.14);    // bocca incisa

  const eyes = [
    add(eyeMat, 0.07, 0.06, 0.04, -0.08, 0.99, -0.15),
    add(eyeMat, 0.07, 0.06, 0.04, 0.08, 0.99, -0.15),
  ];

  // Copricapo Inca: banda dorata, corona di pietra, cresta e ali laterali dorate.
  add(gold, 0.42, 0.06, 0.32, 0, 1.16, 0);
  add(stone, 0.44, 0.16, 0.30, 0, 1.26, 0);
  add(gold, 0.48, 0.05, 0.30, 0, 1.36, 0);
  add(gold, 0.10, 0.22, 0.28, -0.28, 1.27, 0, 0.35);
  add(gold, 0.10, 0.22, 0.28, 0.28, 1.27, 0, -0.35);

  return { group: g, bodyMats: [stone], eyeMats: [eyeMat] };
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
