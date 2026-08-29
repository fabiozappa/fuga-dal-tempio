// Power-up — definizioni ed effetti. Logica pura, nessuna dipendenza.
//
// Stanno sempre in fondo a un ramo cieco, mai sul percorso principale.
// Gli effetti a tempo (Gelo, Rivelatore) usano durate da config.

export const POWERUP_KINDS = {
  EXTRA_LIFE: 'extraLife', // +1 vita, fino al massimo da config
  FREEZE: 'freeze',        // il villain resta immobile per freezeMs
  REVEAL: 'reveal',        // il percorso corretto si riaccende per revealMs
  WINGS: 'wings',          // ali d'angelo: supera subito il livello (raro)
};

// I tre power-up "comuni", assegnati a caso ai rami. Le Ali sono speciali e
// vengono piazzate a parte (probabilità = livello%), quindi NON sono qui.
export const COMMON_POWERUP_KINDS = [
  POWERUP_KINDS.EXTRA_LIFE, POWERUP_KINDS.FREEZE, POWERUP_KINDS.REVEAL,
];

// Etichette leggibili (utili per HUD e debug).
export const POWERUP_LABELS = {
  [POWERUP_KINDS.EXTRA_LIFE]: 'Vita Extra',
  [POWERUP_KINDS.FREEZE]: 'Gelo',
  [POWERUP_KINDS.REVEAL]: 'Rivelatore',
  [POWERUP_KINDS.WINGS]: "Ali d'Angelo",
};

// Applica l'effetto di un power-up allo stato di gioco.
// `state` espone i campi che il power-up può modificare; è il GameState stesso.
// Ritorna una breve descrizione dell'effetto (comoda per log/eventi).
export function applyPowerUp(kind, state) {
  const { config } = state;
  switch (kind) {
    case POWERUP_KINDS.EXTRA_LIFE:
      state.lives = Math.min(config.lives.max, state.lives + 1);
      return 'Vita Extra';
    case POWERUP_KINDS.FREEZE:
      state.freezeRemainingMs = config.powerUps.freezeMs;
      return 'Gelo';
    case POWERUP_KINDS.REVEAL:
      state.revealRemainingMs = config.powerUps.revealMs;
      return 'Rivelatore';
    default:
      return 'Sconosciuto';
  }
}
