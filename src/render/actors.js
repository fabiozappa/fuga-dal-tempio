// Attori — Three.js. Entrambi sprite billboard da immagini dipinte scontornate,
// ancorati ai piedi sulla casella; posizioni interpolate morbidamente.

import * as THREE from 'three';
import { SCREEN_RIGHT, SCREEN_UP } from './camera.js';
import { makeGlowTexture } from './textures.js';

// Costante di tempo dello smoothing (ms): più piccola = più scattante.
const TWEEN_TAU = 55;
const SEP = 0.18;      // sfasamento orizzontale per non sovrapporre le sagome
const STAND_Y = 0;     // i piedi poggiano sulla faccia superiore delle tile (y=0)

// Posizione della fiamma dentro lo sprite dell'esploratrice (frazioni: X dal
// centro, Y dal basso) e colore/dimensione del bagliore.
const TORCH = { normX: -0.27, normY: 0.86, color: 0xffa64a, size: 0.85 };

// Crea uno sprite billboard da un PNG scontornato, ancorato ai piedi (0.5, 0).
function makeSprite(url, aspect, height) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0);
  sprite.scale.set(height * aspect, height, 1);
  return { sprite, mat };
}

// --- Esploratrice (sprite) -------------------------------------------------
const EXPLORER_SPRITE = './assets/images/sprites/esploratrice/explorer.png';
function makeExplorerSprite() {
  return makeSprite(EXPLORER_SPRITE, 679 / 1206, 1.25); // più piccola del guardiano
}

// --- Guardiano (sprite) ----------------------------------------------------
// Immagine dipinta scontornata (PNG con alpha), resa come sprite billboard che
// guarda sempre la camera, ancorato ai piedi sulla casella. Il Gelo lo tinge di
// azzurro ghiaccio.
const GUARDIAN_SPRITE = './assets/images/sprites/guardiano/guardian.png';
function makeGuardianSprite() {
  return makeSprite(GUARDIAN_SPRITE, 826 / 1264, 1.5); // imponente, non enorme
}

export class Actors {
  constructor() {
    this.group = new THREE.Group();

    const explorer = makeExplorerSprite();
    const guardian = makeGuardianSprite();
    this.player = explorer.sprite;
    this.villain = guardian.sprite;
    this.villainMat = guardian.mat;

    // Bagliore caldo della torcia dell'esploratrice (sprite additivo).
    this.torchGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: TORCH.color, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.torchGlow.scale.set(TORCH.size, TORCH.size, 1);

    this.group.add(this.player, this.villain, this.torchGlow);
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

    // Bagliore della torcia: segue la fiamma dell'esploratrice, con un guizzo
    // lento e tenue.
    this.torchTime = (this.torchTime || 0) + dtMs;
    const flicker = 0.94 + 0.045 * Math.sin(this.torchTime * 0.006) + 0.02 * Math.sin(this.torchTime * 0.016);
    const offX = TORCH.normX * this.player.scale.x;
    const offY = TORCH.normY * this.player.scale.y;
    this.torchGlow.position.set(
      this.player.position.x + SCREEN_RIGHT.x * offX + SCREEN_UP.x * offY,
      this.player.position.y + SCREEN_RIGHT.y * offX + SCREEN_UP.y * offY,
      this.player.position.z + SCREEN_RIGHT.z * offX + SCREEN_UP.z * offY
    );
    const s = TORCH.size * flicker;
    this.torchGlow.scale.set(s, s, 1);
    this.torchGlow.material.opacity = 0.75 * flicker;

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
