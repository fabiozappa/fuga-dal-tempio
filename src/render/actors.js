// Attori — Three.js.
//  - giocatore: modello low-poly composito (esploratore/archeologo);
//  - villain:   sprite billboard da immagine dipinta scontornata (guardiano Inca).
// Le posizioni sono interpolate morbidamente tra una casella e l'altra.

import * as THREE from 'three';
import { SCREEN_RIGHT } from './camera.js';

// Costante di tempo dello smoothing (ms): più piccola = più scattante.
const TWEEN_TAU = 55;
const SEP = 0.18;      // sfasamento orizzontale per non sovrapporre le sagome
const STAND_Y = 0;     // i piedi poggiano sulla faccia superiore delle tile (y=0)

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

// --- Guardiano (sprite) ----------------------------------------------------
// Immagine dipinta scontornata (PNG con alpha), resa come sprite billboard che
// guarda sempre la camera, ancorato ai piedi sulla casella. Il Gelo lo tinge di
// azzurro ghiaccio.
const GUARDIAN_SPRITE = './assets/images/sprites/guardiano/guardian.png';
const GUARDIAN_ASPECT = 826 / 1264; // proporzioni del PNG scontornato
const GUARDIAN_HEIGHT = 1.5;        // altezza in unità di mondo (imponente, non enorme)

function makeGuardianSprite() {
  const tex = new THREE.TextureLoader().load(GUARDIAN_SPRITE);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0); // origine ai piedi
  sprite.scale.set(GUARDIAN_HEIGHT * GUARDIAN_ASPECT, GUARDIAN_HEIGHT, 1);
  return { sprite, mat };
}

export class Actors {
  constructor() {
    this.group = new THREE.Group();

    const player = makeExplorer();
    const guardian = makeGuardianSprite();
    this.player = player.group;
    this.villain = guardian.sprite;
    this.villainMat = guardian.mat;

    this.group.add(this.player, this.villain);
    this.player.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    this.villainBaseScale = this.villain.scale.clone();
    this.snapNext = true; // al primo frame posiziona di scatto (niente scivolata)
    this.hideGuardian();  // nascosto finché l'esploratore non fa il primo passo
  }

  reset() {
    this.snapNext = true;
    this.hideGuardian();
  }

  hideGuardian() {
    this.guardianRevealing = false;
    this.guardianRevealed = false;
    this.revealT = 0;
    this.villain.visible = false;
    this.villainMat.opacity = 0;
  }

  // Comparsa del guardiano (fade + piccolo pop), al primo passo dell'esploratore.
  revealGuardian() {
    if (this.guardianRevealed || this.guardianRevealing) return;
    this.guardianRevealing = true;
    this.revealT = 0;
    this.villain.visible = true;
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

    // Feedback del Gelo: lo sprite del guardiano si vela di azzurro ghiaccio.
    const frozen = snap.timers.freezeMs > 0;
    this.villainMat.color.setHex(frozen ? 0x9fd0e6 : 0xffffff);

    // Animazione di comparsa: opacità 0→1 e leggero pop dall'alto (piedi fissi).
    if (this.guardianRevealing) {
      this.revealT += dtMs;
      const p = Math.min(1, this.revealT / 280);
      const eased = 1 - Math.pow(1 - p, 3);
      this.villainMat.opacity = eased;
      const pop = 1 + (1 - eased) * 0.15;
      this.villain.scale.set(this.villainBaseScale.x * pop, this.villainBaseScale.y * pop, 1);
      if (p >= 1) {
        this.guardianRevealing = false;
        this.guardianRevealed = true;
        this.villainMat.opacity = 1;
        this.villain.scale.copy(this.villainBaseScale);
      }
    }

    this.snapNext = false;
  }
}
