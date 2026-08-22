// Villain — logica pura, nessuna dipendenza.
//
// Non copia i passi del giocatore: percorre SEMPRE il percorso corretto, dalla
// riga 0 al traguardo, un passo alla volta a velocità costante. Non sbaglia,
// non entra nei rami ciechi, non subisce penalità.
//
// L'avanzamento usa un accumulatore su delta time (mai setTimeout/setInterval).

export class Villain {
  constructor(path) {
    this.path = path;
    this.index = 0;        // posizione lungo il percorso (indice nell'array path)
    this.stepAccumMs = 0;  // accumulatore per la cadenza dei passi
  }

  // Riporta il villain alla partenza (riga 0). Usato dopo una cattura.
  reset() {
    this.index = 0;
    this.stepAccumMs = 0;
  }

  // Casella attualmente occupata dal villain.
  get cell() {
    return this.path[this.index];
  }

  // Vero se il villain ha raggiunto il traguardo (ultima casella del percorso).
  get atFinish() {
    return this.index >= this.path.length - 1;
  }

  // Fa avanzare l'accumulatore di dtMs. Il consumo effettivo dei passi (con
  // controllo di cattura e traguardo) è gestito dal GameState, che chiama
  // step() a cadenza stepMs. Qui teniamo solo l'accumulatore.
  addTime(dtMs) {
    this.stepAccumMs += dtMs;
  }

  // Vero se è maturato almeno un passo alla cadenza stepMs.
  canStep(stepMs) {
    return this.stepAccumMs >= stepMs;
  }

  // Consuma un passo: scala l'accumulatore e avanza di una casella.
  step(stepMs) {
    this.stepAccumMs -= stepMs;
    this.index += 1;
  }
}
