// Griglia di gioco — logica pura, nessuna dipendenza.
//
// Sistema di coordinate: x = colonna (0..width-1), y = riga (0..height-1).
// Il giocatore parte dalla riga 0 (y=0), il traguardo è l'ultima riga (y=height-1).
// La direzione "up" avanza verso il traguardo, cioè aumenta y.

// Vettori di spostamento per le quattro direzioni cardinali.
// up avvicina al traguardo (y crescente), coerente con WASD/frecce.
export const DIRECTIONS = {
  up:    { dx: 0, dy: 1 },
  down:  { dx: 0, dy: -1 },
  left:  { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// Lista dei quattro spostamenti, utile per iterare (es. generazione rami).
export const DIRECTION_LIST = Object.values(DIRECTIONS);

// Chiave stringa univoca di una casella, per usarla dentro Set/Map.
export function cellKey(x, y) {
  return `${x},${y}`;
}

// Vero se la casella è dentro i limiti della griglia.
export function inBounds(x, y, width, height) {
  return x >= 0 && x < width && y >= 0 && y < height;
}

// Vero se due caselle sono ortogonalmente adiacenti (distanza di Manhattan = 1).
export function areAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

// Vero se due caselle coincidono.
export function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}
