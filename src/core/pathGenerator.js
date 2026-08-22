// Generazione del livello — logica pura, nessuna dipendenza.
//
// Produce:
//  - path:     sequenza ordinata di caselle adiacenti dalla riga 0 all'ultima
//              (il "percorso corretto"), con eventuali spostamenti laterali.
//  - branches: rami ciechi di 1–3 caselle che si diramano dal percorso.
//  - powerUps: un power-up in fondo a ciascun ramo cieco.
//
// Tutti i parametri numerici arrivano da config (nessun valore magico).

import { cellKey, inBounds, DIRECTION_LIST } from './grid.js';
import { POWERUP_KINDS } from './powerUps.js';

// PRNG deterministico (mulberry32): utile per riprodurre livelli in debug.
// Passando un seed si ottiene sempre la stessa sequenza; senza seed si usa
// Math.random.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Intero casuale in [min, max] inclusi, dato un generatore rng() in [0,1).
function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Copia mescolata di un array (Fisher–Yates) usando rng.
function shuffled(rng, array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Genera il percorso corretto: una catena continua di caselle adiacenti dalla
// riga 0 all'ultima. Ad ogni riga può spostarsi lateralmente prima di salire.
export function generatePath(width, height, rng = Math.random) {
  let col = randInt(rng, 0, width - 1);
  const path = [{ x: col, y: 0 }];

  for (let y = 0; y < height - 1; y++) {
    // Spostamento laterale sulla riga corrente (max 2 caselle per riga).
    const shift = randInt(rng, -2, 2);
    const targetCol = Math.max(0, Math.min(width - 1, col + shift));
    while (col !== targetCol) {
      col += Math.sign(targetCol - col);
      path.push({ x: col, y });
    }
    // Passo verso la riga successiva.
    path.push({ x: col, y: y + 1 });
  }

  return path;
}

// Genera i rami ciechi a partire dal percorso, con un power-up in fondo a ciascuno.
// I rami non toccano mai l'ultima riga, per evitare vittorie ambigue.
export function generateBranches(path, width, height, config, rng = Math.random) {
  const { minPerLevel, maxPerLevel, minLength, maxLength } = config.branches;
  const kinds = Object.values(POWERUP_KINDS);

  // Caselle già occupate: percorso + rami generati finora.
  const occupied = new Set(path.map((c) => cellKey(c.x, c.y)));

  // Ancore candidate: caselle del percorso escluse partenza e traguardo.
  const anchors = shuffled(
    rng,
    path.filter((c) => c.y > 0 && c.y < height - 1)
  );

  const branches = [];
  const powerUps = [];
  const target = randInt(rng, minPerLevel, maxPerLevel);

  for (const anchor of anchors) {
    if (branches.length >= target) break;

    const length = randInt(rng, minLength, maxLength);
    const cells = [];
    let cur = anchor;

    // Estende il ramo una casella alla volta in una direzione libera.
    for (let i = 0; i < length; i++) {
      let moved = false;
      for (const d of shuffled(rng, DIRECTION_LIST)) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (!inBounds(nx, ny, width, height)) continue;
        if (ny === height - 1) continue; // mai sull'ultima riga
        const k = cellKey(nx, ny);
        if (occupied.has(k)) continue;
        cur = { x: nx, y: ny };
        cells.push(cur);
        occupied.add(k);
        moved = true;
        break;
      }
      if (!moved) break; // vicolo saturo: il ramo resta più corto
    }

    if (cells.length === 0) continue;

    // Power-up in fondo al ramo (mai sul percorso principale).
    const kind = kinds[randInt(rng, 0, kinds.length - 1)];
    const tip = cells[cells.length - 1];
    branches.push({ cells, powerUp: kind });
    powerUps.push({ x: tip.x, y: tip.y, kind, collected: false });
  }

  return { branches, powerUps };
}

// Genera un livello completo e precalcola gli insiemi di chiavi utili al motore.
export function generateLevel(width, height, config, rng = Math.random) {
  const path = generatePath(width, height, rng);
  const { branches, powerUps } = generateBranches(path, width, height, config, rng);

  const pathKeys = new Set(path.map((c) => cellKey(c.x, c.y)));
  const branchKeys = new Set();
  for (const b of branches) {
    for (const c of b.cells) branchKeys.add(cellKey(c.x, c.y));
  }
  // Caselle calpestabili senza penalità: percorso + rami.
  const walkableKeys = new Set([...pathKeys, ...branchKeys]);

  return { path, branches, powerUps, pathKeys, branchKeys, walkableKeys };
}
