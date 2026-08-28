// Scena e renderer — Three.js. Compone camera, tile e attori e disegna lo
// snapshot fornito dal core. Non contiene logica di gioco.

import * as THREE from 'three';
import { createCamera, fitCameraToBoard } from './camera.js';
import { TileGrid } from './tiles.js';
import { Actors } from './actors.js';

const BG_COLOR = 0x121c12;   // fallback finché non carica l'immagine di sfondo
const BG_IMAGE = './assets/images/backgroundinca.png';
const SPACING = 1;    // distanza tra i centri delle tile, in unità di mondo
const CAM_PAD = 2.2;  // margine attorno alla plancia: lascia respirare il fondale

export class GameRenderer {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.camera = createCamera();

    // Fondale dipinto (cortile del tempio con statue Inca attorno): riempie lo
    // schermo con adattamento "cover" (niente distorsione, si tagliano i bordi).
    this.bgTexture = null;
    new THREE.TextureLoader().load(BG_IMAGE, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      this.bgTexture = tex;
      this.scene.background = tex;
      this.updateBackgroundCover();
    });

    // Illuminazione da giungla: sole caldo tra le fronde + rimbalzo verde.
    this.scene.add(new THREE.AmbientLight(0xdfe6c8, 0.5));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.25);
    sun.position.set(6, 12, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    const s = 16; // il frustum d'ombra copre l'intera plancia più i bordi
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    // Controluce freddo per staccare le sagome dallo sfondo.
    const rim = new THREE.DirectionalLight(0x6fa0b0, 0.35);
    rim.position.set(-6, 4, -6);
    this.scene.add(rim);
    // Cielo verdastro (canopia), terra terrosa.
    this.scene.add(new THREE.HemisphereLight(0x3e5a2e, 0x241a10, 0.5));

    this.tiles = new TileGrid(SPACING);
    this.actors = new Actors();
    this.scene.add(this.tiles.group, this.actors.group);

    this.dimKey = ''; // dimensioni per cui la griglia è costruita
    this.resize();
  }

  // Adatta il fondale al viewport in modalità "cover" (riempi, ritaglia i bordi).
  updateBackgroundCover() {
    if (!this.bgTexture || !this.bgTexture.image) return;
    const img = this.bgTexture.image;
    const imgA = img.width / img.height;
    const viewA = this.container.clientWidth / this.container.clientHeight;
    const t = this.bgTexture;
    if (viewA > imgA) {
      t.repeat.set(1, imgA / viewA);
      t.offset.set(0, (1 - imgA / viewA) / 2);
    } else {
      t.repeat.set(viewA / imgA, 1);
      t.offset.set((1 - viewA / imgA) / 2, 0);
    }
    t.needsUpdate = true;
  }

  // (Ri)costruisce la griglia quando cambiano le dimensioni della plancia.
  setDimensions(width, height, powerUps) {
    this.tiles.build(width, height, powerUps);
    this.dimKey = width + 'x' + height;
    this.actors.reset(); // niente scivolata degli attori al cambio livello
    this.refitCamera();
  }

  refitCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    fitCameraToBoard(
      this.camera,
      { width: this.tiles.width, height: this.tiles.height, spacing: SPACING },
      aspect,
      CAM_PAD
    );
  }

  // Disegna lo snapshot. Ricostruisce la griglia se le dimensioni sono cambiate.
  sync(snap, now, dtMs, errorFlash) {
    const dimKey = snap.width + 'x' + snap.height;
    if (dimKey !== this.dimKey) {
      this.setDimensions(snap.width, snap.height, snap.powerUps);
    }
    this.tiles.update(snap, now, errorFlash);
    this.actors.update(snap, this.tiles, dtMs);
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.updateBackgroundCover();
    if (this.tiles.width) this.refitCamera();
  }
}
