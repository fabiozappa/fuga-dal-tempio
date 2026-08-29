// GameState — macchina a stati e regole del round. Logica pura, nessuna
// dipendenza da Three.js. Il timing usa un accumulatore su delta time: il
// chiamante (debug.html o main.js) esegue un loop e passa dtMs a update().

import { cellKey, sameCell, inBounds, DIRECTIONS } from './grid.js';
import { generateLevel, mulberry32 } from './pathGenerator.js';
import { Villain } from './villain.js';
import { applyPowerUp, POWERUP_KINDS } from './powerUps.js';

// Le quattro fasi del round + gli esiti terminali.
export const PHASES = {
  PREVIEW: 'preview',        // il percorso si illumina, input disabilitato
  FUGA: 'fuga',              // il giocatore si muove, il villain è fermo
  CHASE: 'inseguimento',     // il villain avanza a velocità costante
  WON: 'won',                // livello superato
  GAME_OVER: 'gameOver',     // partita finita
};

export class GameState {
  constructor({ config, seed } = {}) {
    this.config = config;
    // Con un seed i livelli sono riproducibili (comodo in debug).
    this.rng = seed != null ? mulberry32(seed) : Math.random;
    this.events = []; // coda di eventi consumata dal chiamante (drainEvents)
    this.level = 1;
    this.lives = config.lives.start;
  }

  // --- Avvio ---------------------------------------------------------------

  // Nuova partita da zero: livello 1, vite ripristinate, punteggio a zero.
  startGame() {
    this.level = 1;
    this.lives = this.config.lives.start;
    this.score = 0; // +1 per casella scoperta, −1 per passo del villain
    this.startLevel();
  }

  // Passa al livello successivo (H cresce di 1), mantenendo le vite.
  nextLevel() {
    this.level += 1;
    this.startLevel();
  }

  // Prepara un nuovo livello e va in PREVIEW.
  startLevel() {
    // Id univoco di questa istanza di livello: cambia ad ogni generazione, anche
    // a parità di dimensioni. La vista lo usa per ricostruire (percorso/power-up
    // nuovi) invece di fidarsi solo delle dimensioni.
    this.levelId = (this.levelId || 0) + 1;

    this.width = this.config.grid.width;
    this.height = this.config.grid.baseHeight + (this.level - 1);

    const lvl = generateLevel(this.width, this.height, this.config, this.rng);
    this.path = lvl.path;
    this.pathKeys = lvl.pathKeys;
    this.branchKeys = lvl.branchKeys;
    this.walkableKeys = lvl.walkableKeys;
    this.powerUps = lvl.powerUps.map((p) => ({ ...p }));

    // Ali d'Angelo: rare (probabilità = livello%). Se escono, sostituiscono uno
    // dei power-up comuni del livello.
    if (this.powerUps.length && this.rng() < this.level / 100) {
      const i = Math.floor(this.rng() * this.powerUps.length);
      this.powerUps[i].kind = POWERUP_KINDS.WINGS;
    }

    // Il giocatore parte dalla prima casella del percorso.
    this.player = { ...this.path[0] };
    this.playerTrail = [{ ...this.player }];

    // Le caselle sbloccate restano illuminate per tutto il round.
    this.unlocked = new Set([cellKey(this.player.x, this.player.y)]);

    this.villain = new Villain(this.path);

    // Difficoltà del livello: il villain accelera e il vantaggio cala (vedi
    // config.difficulty). Calcolati una volta per livello.
    const t = this.config.timing;
    const d = this.config.difficulty;
    this.villainStepMs = Math.max(
      d.villainStepMinMs, t.villainStepMs - (this.level - 1) * d.villainStepDecrementMs
    );
    this.headStartMs = Math.max(
      d.headStartMinMs, t.villainHeadStartMs - (this.level - 1) * d.headStartDecrementMs
    );

    // Timer delle fasi ed effetti.
    this.previewRemainingMs = this.config.timing.previewMs;
    this.headStartRemainingMs = this.headStartMs;
    this.freezeRemainingMs = 0;
    this.revealRemainingMs = 0;
    this.stepCooldownRemainingMs = 0;
    this.lastError = null;

    this.phase = PHASES.PREVIEW;
    this.emit('phase', { phase: this.phase });
  }

  // --- Loop temporale ------------------------------------------------------

  update(dtMs) {
    // Cooldown dei passi del giocatore: scorre sempre, così è pronto quando
    // inizia la FUGA. Un passo per input, con questa attesa minima tra due.
    if (this.stepCooldownRemainingMs > 0) {
      this.stepCooldownRemainingMs = Math.max(0, this.stepCooldownRemainingMs - dtMs);
    }

    switch (this.phase) {
      case PHASES.PREVIEW:
        this.updatePreview(dtMs);
        break;
      case PHASES.FUGA:
        this.updateFuga(dtMs);
        break;
      case PHASES.CHASE:
        this.updateChase(dtMs);
        break;
      default:
        break; // WON, GAME_OVER: nessun avanzamento
    }
  }

  updatePreview(dtMs) {
    this.previewRemainingMs -= dtMs;
    if (this.previewRemainingMs <= 0) {
      this.previewRemainingMs = 0;
      this.enterFuga();
    }
  }

  // Entra in FUGA: il villain è fermo, parte il conto del vantaggio iniziale.
  enterFuga() {
    this.phase = PHASES.FUGA;
    this.headStartRemainingMs = this.headStartMs; // vantaggio del livello corrente
    this.emit('phase', { phase: this.phase });
  }

  updateFuga(dtMs) {
    this.tickEffects(dtMs);
    this.headStartRemainingMs -= dtMs;
    if (this.headStartRemainingMs <= 0) {
      this.headStartRemainingMs = 0;
      this.enterChase();
    }
  }

  // Entra in INSEGUIMENTO: il villain comincia ad avanzare.
  enterChase() {
    this.phase = PHASES.CHASE;
    this.villain.stepAccumMs = 0;
    this.emit('phase', { phase: this.phase });
  }

  updateChase(dtMs) {
    // Il Rivelatore continua a scorrere anche durante l'inseguimento.
    if (this.revealRemainingMs > 0) {
      this.revealRemainingMs = Math.max(0, this.revealRemainingMs - dtMs);
    }

    // Gelo: se attivo, il villain resta immobile e scala il timer.
    if (this.freezeRemainingMs > 0) {
      this.freezeRemainingMs = Math.max(0, this.freezeRemainingMs - dtMs);
      return;
    }

    // Avanzamento del villain a cadenza costante (può fare più passi se dt è
    // grande, es. scheda tornata in primo piano). Controlli passo per passo.
    this.villain.addTime(dtMs);
    const stepMs = this.villainStepMs;
    while (this.phase === PHASES.CHASE && this.villain.canStep(stepMs)) {
      if (this.villain.atFinish) {
        this.triggerGameOver('villainFinish');
        return;
      }
      this.villain.step(stepMs);
      this.score -= 1; // −1 punto per ogni casella percorsa dal villain
      this.emit('villainStep', { cell: { ...this.villain.cell } }); // passo pesante
      // Cattura: villain sulla stessa casella del giocatore.
      if (sameCell(this.villain.cell, this.player)) {
        this.handleCapture();
        return;
      }
      // Villain arrivato al traguardo prima del giocatore.
      if (this.villain.atFinish) {
        this.triggerGameOver('villainFinish');
        return;
      }
    }
  }

  // Scala i timer degli effetti a tempo (usato in FUGA).
  tickEffects(dtMs) {
    if (this.revealRemainingMs > 0) {
      this.revealRemainingMs = Math.max(0, this.revealRemainingMs - dtMs);
    }
    if (this.freezeRemainingMs > 0) {
      this.freezeRemainingMs = Math.max(0, this.freezeRemainingMs - dtMs);
    }
  }

  // --- Input del giocatore -------------------------------------------------

  // Muove il giocatore di un passo nella direzione data ('up'|'down'|'left'|
  // 'right'). Consentito solo in FUGA e INSEGUIMENTO. Può essere chiamata ad
  // ogni frame tenendo premuto: il cooldown limita a un passo per volta.
  movePlayer(direction) {
    if (this.phase !== PHASES.FUGA && this.phase !== PHASES.CHASE) return;
    if (this.stepCooldownRemainingMs > 0) return; // troppo presto dal passo scorso
    const d = DIRECTIONS[direction];
    if (!d) return;

    const nx = this.player.x + d.dx;
    const ny = this.player.y + d.dy;

    // Fuori griglia: input ignorato, nessuna penalità e nessun cooldown.
    if (!inBounds(nx, ny, this.width, this.height)) return;

    // Input accettato: avvia il cooldown (vale sia per passi validi che errati).
    this.stepCooldownRemainingMs = this.config.timing.playerStepCooldownMs;

    const key = cellKey(nx, ny);

    if (this.walkableKeys.has(key)) {
      // Passo valido: percorso o ramo. Nessuna penalità.
      const isNewCell = !this.unlocked.has(key); // scoperta = prima volta su questa casella
      this.player = { x: nx, y: ny };
      this.playerTrail.push({ x: nx, y: ny });
      this.unlocked.add(key);
      if (isNewCell) this.score += 1; // +1 punto per casella scoperta
      this.lastError = null;
      this.emit('step', { cell: { x: nx, y: ny } });

      this.collectPowerUpAt(nx, ny);

      // Vittoria: raggiunta l'ultima riga (solo via percorso principale).
      if (ny === this.height - 1) {
        this.phase = PHASES.WON;
        this.emit('win', { level: this.level });
      }
    } else {
      // Casella sbagliata: −1 vita, la casella lampeggia, si torna indietro.
      this.handleWrongStep(nx, ny);
    }
  }

  // Raccolta di un power-up se presente e non ancora preso su (x,y).
  collectPowerUpAt(x, y) {
    const pu = this.powerUps.find((p) => p.x === x && p.y === y && !p.collected);
    if (!pu) return;
    pu.collected = true;
    this.emit('powerUp', { kind: pu.kind, cell: { x, y } });

    // Ali d'Angelo: superano subito il livello.
    if (pu.kind === POWERUP_KINDS.WINGS) {
      this.phase = PHASES.WON;
      this.emit('win', { level: this.level });
      return;
    }
    applyPowerUp(pu.kind, this);
  }

  // Gestisce un passo su casella sbagliata.
  handleWrongStep(x, y) {
    this.lives -= 1;
    this.lastError = { x, y };
    this.emit('wrongStep', { cell: { x, y } });

    // Torna indietro di una posizione lungo il proprio tracciato.
    if (this.playerTrail.length > 1) {
      this.playerTrail.pop();
      this.player = { ...this.playerTrail[this.playerTrail.length - 1] };
    }

    if (this.lives <= 0) this.triggerGameOver('lives');
  }

  // Gestisce la cattura: −1 vita, giocatore al via, villain riparte da riga 0
  // e il vantaggio iniziale si riattiva. Le caselle sbloccate restano accese.
  handleCapture() {
    this.lives -= 1;
    this.emit('capture', {});

    if (this.lives <= 0) {
      this.triggerGameOver('lives');
      return;
    }

    // Giocatore riportato alla casella iniziale (l'illuminazione resta).
    this.player = { ...this.path[0] };
    this.playerTrail = [{ ...this.player }];

    // Villain riparte dalla riga 0, si ritorna in FUGA col nuovo vantaggio.
    this.villain.reset();
    this.freezeRemainingMs = 0;
    this.enterFuga();
  }

  triggerGameOver(reason) {
    this.phase = PHASES.GAME_OVER;
    this.emit('gameOver', { reason }); // reason: 'lives' | 'villainFinish'
  }

  // --- Eventi --------------------------------------------------------------

  emit(type, payload) {
    this.events.push({ type, ...payload });
  }

  // Restituisce e svuota la coda degli eventi accumulati.
  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  // --- Snapshot per la vista ----------------------------------------------

  // Il percorso è visibile quando è in anteprima o quando il Rivelatore è attivo.
  get isPathRevealed() {
    return this.phase === PHASES.PREVIEW || this.revealRemainingMs > 0;
  }

  // Stato completo, come oggetto semplice, per il rendering (debug o 3D).
  getSnapshot() {
    return {
      level: this.level,
      levelId: this.levelId,
      phase: this.phase,
      lives: this.lives,
      score: this.score,
      width: this.width,
      height: this.height,
      player: { ...this.player },
      villain: {
        x: this.villain.cell.x,
        y: this.villain.cell.y,
        active: this.phase === PHASES.CHASE,
      },
      path: this.path.map((c) => ({ ...c })),
      pathKeys: this.pathKeys,
      branchKeys: this.branchKeys,
      powerUps: this.powerUps.map((p) => ({ ...p })),
      unlocked: this.unlocked,
      reveal: this.isPathRevealed,
      lastError: this.lastError ? { ...this.lastError } : null,
      timers: {
        previewMs: Math.max(0, this.previewRemainingMs),
        headStartMs: Math.max(0, this.headStartRemainingMs),
        freezeMs: Math.max(0, this.freezeRemainingMs),
        revealMs: Math.max(0, this.revealRemainingMs),
      },
    };
  }
}
