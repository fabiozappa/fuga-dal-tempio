// Tile della griglia + gemme dei power-up — Three.js.
// Legge lo snapshot del core e colora ogni casella secondo il suo stato.

import * as THREE from 'three';
import { cellKey } from '../core/grid.js';

// Tinte per stato della casella. Il colore moltiplica la texture di terra;
// l'emissione dà il "bagliore" alle caselle rivelate.
//  off       → terra in ombra (sentiero spento)
//  unlocked  → terra illuminata dalla torcia (già percorsa)
//  path      → giada/turchese (percorso corretto rivelato)
//  branch    → ambra (deviazione verso un power-up)
//  power     → oro (casella col power-up)
//  collected → terra spenta (power-up già preso)
//  error     → cinabro (casella sbagliata)
const COLORS = {
  off:       0x5a4a30,
  unlocked:  0xb08a52,
  path:      0x2ec4b6,
  branch:    0xd08a34,
  power:     0xf2c744,
  collected: 0x6b573a,
  error:     0xc0392b,
};
const GEM_COLOR = 0xf5c542;
const TILE_THICK = 0.1;      // spessore del vetro
const TILE_BEVEL = 0.02;     // smusso dello spigolo superiore

// Rettangolo con angoli stondati, centrato nell'origine.
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Geometria di una tile: lastra di vetro con angoli stondati e spigolo smussato.
// w,h = ingombro finale (bevel incluso); la faccia superiore è portata a y=0.
function makeTileGeometry(w, h) {
  const sw = w - 2 * TILE_BEVEL, sh = h - 2 * TILE_BEVEL;
  const r = Math.min(sw, sh) * 0.22;
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(sw, sh, r), {
    depth: TILE_THICK - 2 * TILE_BEVEL, curveSegments: 6,
    bevelEnabled: true, bevelThickness: TILE_BEVEL, bevelSize: TILE_BEVEL, bevelSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  geo.translate(0, -geo.boundingBox.max.y, 0); // faccia superiore a y=0

  // Offset UV casuale: ogni tile di pietra mostra una porzione diversa della
  // texture (seamless), evitando la ripetizione identica tra le caselle.
  const uv = geo.attributes.uv;
  const ox = Math.random() * 4, oy = Math.random() * 4;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + ox, uv.getY(i) + oy);
  uv.needsUpdate = true;
  return geo;
}

export class TileGrid {
  constructor(spacing = 1) {
    this.group = new THREE.Group();
    this.spacing = spacing;
    this.width = 0;
    this.height = 0;
    this.tiles = new Map();   // key → mesh
    this.gems = [];           // { mesh, x, y }

    // Caselle di vetro smerigliato: si posano sul cortile dipinto (che traspare
    // sfocato) e si illuminano come rune del tempio.
    this.glassColor = new THREE.Color(0xcfe0dd);

    // Pietra Inca: le caselle già percorse diventano una lastra di pietra vera.
    this.stoneTex = new THREE.TextureLoader().load('./assets/images/incastone.png');
    this.stoneTex.colorSpace = THREE.SRGBColorSpace;
    this.stoneTex.wrapS = this.stoneTex.wrapT = THREE.RepeatWrapping;
    this.stoneTex.repeat.set(0.6, 0.6); // scala del pattern per tile
    this.stoneMat = new THREE.MeshStandardMaterial({
      map: this.stoneTex, bumpMap: this.stoneTex, bumpScale: 0.03,
      color: 0xd8d0bd, roughness: 0.95, metalness: 0.02,
      emissive: 0x3a2a12, emissiveIntensity: 0.3, // tinta calda da torcia
    });
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
    // Pulisce la griglia precedente (geometria e vetro per-tile vanno liberati;
    // il materiale pietra è condiviso e resta).
    for (const mesh of this.tiles.values()) {
      mesh.geometry.dispose();
      if (mesh.userData.glassMat) mesh.userData.glassMat.dispose();
      this.group.remove(mesh);
    }
    this.tiles.clear();
    for (const g of this.gems) this.group.remove(g.mesh);
    this.gems = [];

    this.width = width;
    this.height = height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const mat = new THREE.MeshPhysicalMaterial({
          color: this.glassColor, metalness: 0, roughness: 0.35,
          transmission: 0.92, thickness: 0.5, ior: 1.3, transparent: true,
          clearcoat: 0.5, clearcoatRoughness: 0.35,
          emissive: 0x000000, emissiveIntensity: 0,
        });
        // Ingombro casuale 85–100% della cella (indipendente su x e z): la
        // griglia resta fissa, le tile dentro sono irregolari.
        const w = this.spacing * (0.85 + Math.random() * 0.15);
        const d = this.spacing * (0.85 + Math.random() * 0.15);
        const mesh = new THREE.Mesh(makeTileGeometry(w, d), mat);
        mesh.userData.glassMat = mat; // materiale vetro (finché non è percorsa)
        const p = this.worldPos(x, y);
        mesh.position.set(p.x, -0.05, p.z); // faccia superiore a y=0
        mesh.rotation.y = (Math.random() - 0.5) * 0.05; // micro-rotazione
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
      // Casella già percorsa: diventa (e resta) lastra di pietra Inca.
      if (snap.unlocked.has(key)) {
        if (mesh.material !== this.stoneMat) mesh.material = this.stoneMat;
        continue;
      }

      // Non ancora percorsa: vetro smerigliato, che si illumina se rivelata.
      const glass = mesh.userData.glassMat;
      if (mesh.material !== glass) mesh.material = glass;

      const isPath = snap.pathKeys.has(key);
      const isBranch = snap.branchKeys.has(key);
      const pu = puByKey.get(key);

      let color = COLORS.off;
      let revealed = false; // colorata dal "reveal" (pulsa)
      if (snap.reveal && isPath) { color = COLORS.path; revealed = true; }
      if (snap.reveal && isBranch) { color = COLORS.branch; revealed = true; }
      if (snap.reveal && pu && !pu.collected) { color = COLORS.power; revealed = true; }
      const isError = errorFlash && errorFlash.key === key && now < errorFlash.until;
      if (isError) { color = COLORS.error; revealed = false; }

      glass.emissive.setHex(color);
      let intensity = 0;
      if (revealed) intensity = 0.9 * pulse; // rivelato: pulsa
      if (isError) intensity = 1.1; // lampeggio errore
      glass.emissiveIntensity = intensity;
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
