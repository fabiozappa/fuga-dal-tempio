// Fuga Isometrica — parametri di bilanciamento
//
// Regola d'oro (vedi CLAUDE.md): qui vive OGNI numero che riguarda il
// bilanciamento del gioco. Nessun valore magico deve comparire altrove nel
// codice. Questi sono valori di partenza: vanno tarati giocando, non a tavolino.
//
// Manopola principale del gioco: il rapporto tra `playerStepCooldownMs` e
// `villainStepMs`. A 400 vs 700 ms il giocatore è ~1,75× più veloce: corre,
// recupera terreno, poi lo ricede quando devia per raccogliere un power-up.

export const CONFIG = {
  // Griglia di gioco.
  // width      → larghezza fissa in caselle (colonne sempre visibili).
  // baseHeight → lunghezza al livello 1. La lunghezza effettiva è
  //              baseHeight + (livello − 1).
  grid: {
    width: 6,
    baseHeight: 4,
  },

  // Cadenze e durate, tutte in millisecondi.
  // Il timing di gioco usa un accumulatore su performance.now() con delta time:
  // questi valori NON vanno mai passati a setTimeout/setInterval.
  timing: {
    previewMs: 3000,            // durata anteprima del percorso corretto
    villainHeadStartMs: 3000,   // vantaggio iniziale prima che il villain parta
    villainStepMs: 700,         // durata di un passo del villain
    playerStepCooldownMs: 400,  // attesa minima tra due passi del giocatore
  },

  // Vite del giocatore.
  // start → vite all'inizio della partita.
  // max   → tetto massimo, il power-up Vita Extra non lo supera.
  lives: {
    start: 3,
    max: 5,
  },

  // Durata degli effetti dei power-up, in millisecondi.
  // freezeMs → per quanto il villain resta immobile (power-up Gelo).
  // revealMs → per quanto si riaccende il percorso corretto (power-up Rivelatore).
  powerUps: {
    freezeMs: 4000,
    revealMs: 2500,
  },

  // Generazione dei rami ciechi che si diramano dal percorso principale.
  // rowsPerPowerUp    → un power-up ogni N righe: il numero di rami per livello
  //                     è floor(H / rowsPerPowerUp), distribuiti lungo la plancia.
  // minLength/maxLength → lunghezza di ciascun ramo, in caselle.
  // In fondo a ogni ramo c'è un power-up; mai sul percorso principale.
  branches: {
    rowsPerPowerUp: 3,
    minLength: 1,
    maxLength: 3,
  },
};
