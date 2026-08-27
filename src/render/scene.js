// Scena e renderer — Three.js. Compone camera, tile e attori e disegna lo
// snapshot fornito dal core. Non contiene logica di gioco.

import * as THREE from 'three';
import { createCamera, fitCameraToBoard } from './camera.js';
import { TileGrid } from './tiles.js';
import { Actors } from './actors.js';

const BG_COLOR = 0x0a0a12;
const SPACING = 1; // distanza tra i centri delle tile, in unità di mondo

export class GameRenderer {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.camera = createCamera();

    // Luci: ambiente morbido + direzionale per dare volume alle capsule.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);
    this.scene.add(new THREE.HemisphereLight(0x88aaff, 0x101018, 0.4));

    this.tiles = new TileGrid(SPACING);
    this.actors = new Actors();
    this.scene.add(this.tiles.group, this.actors.group);

    this.dimKey = ''; // dimensioni per cui la griglia è costruita
    this.resize();
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
      aspect
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
    if (this.tiles.width) this.refitCamera();
  }
}
