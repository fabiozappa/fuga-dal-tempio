// Scena e renderer — Three.js. Compone camera, tile e attori e disegna lo
// snapshot fornito dal core. Non contiene logica di gioco.

import * as THREE from 'three';
import { createCamera, fitCameraToBoard } from './camera.js';
import { TileGrid } from './tiles.js';
import { Actors } from './actors.js';
import { makeGroundTexture } from './textures.js';

const BG_COLOR = 0x121c12;   // verde giungla profondo
const FOG_COLOR = 0x18261a;  // nebbia verde-terrosa
const SPACING = 1; // distanza tra i centri delle tile, in unità di mondo

export class GameRenderer {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    // Nebbia: la camera ortografica è a ~100 unità, quindi il range è attorno a
    // quella distanza. Lascia la plancia leggibile e sfuma il terreno lontano
    // nella giungla.
    this.scene.fog = new THREE.Fog(FOG_COLOR, 92, 165);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.camera = createCamera();

    // Illuminazione da giungla: sole caldo tra le fronde + rimbalzo verde.
    this.scene.add(new THREE.AmbientLight(0xdfe6c8, 0.5));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.25);
    sun.position.set(6, 12, 4);
    this.scene.add(sun);
    // Controluce freddo per staccare le sagome dallo sfondo.
    const rim = new THREE.DirectionalLight(0x6fa0b0, 0.35);
    rim.position.set(-6, 4, -6);
    this.scene.add(rim);
    // Cielo verdastro (canopia), terra terrosa.
    this.scene.add(new THREE.HemisphereLight(0x3e5a2e, 0x241a10, 0.5));

    // Terreno della giungla sotto e attorno alla plancia.
    const groundTex = makeGroundTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ map: groundTex, color: 0x2a3a20, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.35; // appena sotto la base delle tile
    this.scene.add(ground);

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
