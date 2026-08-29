// Punto di ingresso del gioco 3D. Collega core (logica), render (Three.js) e
// input. Il loop usa un accumulatore su performance.now() con delta time.

import { CONFIG } from './config.js';
import { GameState, PHASES } from './core/gameState.js';
import { cellKey } from './core/grid.js';
import { POWERUP_LABELS } from './core/powerUps.js';
import { GameRenderer } from './render/scene.js';
import { createKeyboard } from './input/keyboard.js';
import { createTouchDpad } from './input/touch.js';
import { Sound } from './audio/sound.js';

const PHASE_LABEL = {
  [PHASES.PREVIEW]: 'ANTEPRIMA',
  [PHASES.FUGA]: 'FUGA',
  [PHASES.CHASE]: 'INSEGUIMENTO',
  [PHASES.WON]: 'LIVELLO SUPERATO',
  [PHASES.GAME_OVER]: 'GAME OVER',
};

const container = document.getElementById('game');
const renderer = new GameRenderer(container);

const game = new GameState({ config: CONFIG });
game.startGame(); // prepara una scena (percorso mostrato dietro il titolo)

// Handle di debug: comodo per ispezionare o pilotare lo stato dalla console.
window.game = game;
window.renderer = renderer;

// Stato dell'interfaccia: 'title' | 'playing' | 'over'. La logica di gioco
// avanza solo in 'playing'; le schermate sono overlay DOM.
let uiState = 'title';

const $ = (id) => document.getElementById(id);
let banner = { text: '', until: 0 };
let errorFlash = { key: null, until: 0 };

// Scossa+vibrazione al passo del guardiano: attiva di default, si commuta con V,
// e parte solo dopo il primo passo dell'esploratore.
let quakeEnabled = true;
let playerMoved = false;

// Pausa di fine livello (ms rimanenti): fermo immagine prima del livello dopo.
let winTimer = 0;

// Record persistente (livello massimo raggiunto) in localStorage.
const BEST_KEY = 'fuga_best';
function loadBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* storage non disponibile */ }
}
let best = loadBest();
const bestText = () => (best > 0 ? 'Record: livello ' + best : 'Nessun record');

// --- Classifica a punti (file JSON sul server via leaderboard.php) ----------
const LEADERBOARD_URL = './leaderboard.php';
let pendingScore = 0;

const escapeHtml = (s) => String(s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function fetchLeaderboard() {
  const r = await fetch(LEADERBOARD_URL, { cache: 'no-store' });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
async function submitScore(name, score) {
  const r = await fetch(LEADERBOARD_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score }),
  });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
function qualifies(list, score) {
  return list.length < 10 || score > list[list.length - 1].score;
}
function renderLeaderboard(list, meName) {
  const el = $('leaderboard');
  if (!list || list.length === 0) {
    el.innerHTML = '<li class="empty">Classifica vuota — sii il primo!</li>';
    return;
  }
  el.innerHTML = list.map((e, i) => {
    const me = meName != null && e.name === meName ? ' me' : '';
    return `<li class="${me.trim()}"><span class="rank">${i + 1}</span>`
      + `<span class="nm">${escapeHtml(e.name)}</span>`
      + `<span class="sc">${e.score}</span></li>`;
  }).join('');
}

// Al game over: mostra classifica; se il punteggio entra in top 10, chiede il nome.
async function showLeaderboard(score) {
  pendingScore = score;
  $('nameEntry').classList.add('hidden');
  $('leaderboard').innerHTML = '<li class="empty">Carico…</li>';
  try {
    const list = await fetchLeaderboard();
    renderLeaderboard(list);
    if (qualifies(list, score)) {
      $('nameEntry').classList.remove('hidden');
      const inp = $('nameInput');
      inp.value = '';
      inp.focus();
    }
  } catch (e) {
    $('leaderboard').innerHTML = '<li class="empty">Classifica non disponibile</li>';
  }
}
async function onSaveScore() {
  const name = ($('nameInput').value || '').trim() || 'Anonimo';
  $('saveScore').disabled = true;
  try {
    const list = await submitScore(name, pendingScore);
    renderLeaderboard(list, name);
  } catch (e) { /* offline: ignora */ }
  $('nameEntry').classList.add('hidden');
  $('saveScore').disabled = false;
}

// Audio procedurale. Va "risvegliato" al primo gesto dell'utente.
const sound = new Sound();

// Vibrazione mobile (se supportata).
const vibrate = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };

// Stato dell'input condiviso: `heldDir` è la direzione tenuta premuta (tastiera
// o D-Pad). Il core applica il cooldown, quindi si può chiamare movePlayer ad
// ogni frame senza timer nell'input.
const input = { heldDir: null };
const step = (dir) => { if (uiState === 'playing') game.movePlayer(dir); };

// Avvia (o riavvia) una partita da zero e nasconde le schermate.
function beginGame() {
  sound.resume();
  game.startGame();
  banner = { text: '', until: 0 };
  input.heldDir = null;
  playerMoved = false;
  uiState = 'playing';
  $('title').classList.add('hidden');
  $('gameover').classList.add('hidden');
}

createKeyboard({ input, onPress: step, onRestart: beginGame });
createTouchDpad({ input, onPress: step, onRestart: beginGame });

// Scossa/vibrazione: toggle da tasto V o dal pulsante dedicato.
function updateQuakeBtn() {
  const b = $('quake');
  if (b) b.classList.toggle('off', !quakeEnabled);
}
function toggleQuake() {
  quakeEnabled = !quakeEnabled;
  updateQuakeBtn();
  banner = { text: 'Scossa ' + (quakeEnabled ? 'ON' : 'OFF'), until: performance.now() + 1200 };
}
window.addEventListener('keydown', (ev) => { if (ev.code === 'KeyV') toggleQuake(); });
const quakeBtn = $('quake');
if (quakeBtn) {
  quakeBtn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); toggleQuake(); });
}

// Lampo bianco a schermo intero (comparsa del guardiano).
function flashScreen() {
  const f = $('flash');
  if (!f) return;
  f.style.transition = 'none';
  f.style.opacity = '0.55';
  requestAnimationFrame(() => {
    f.style.transition = 'opacity 380ms ease-out';
    f.style.opacity = '0';
  });
}

// Pulsanti delle schermate.
$('playBtn').addEventListener('click', beginGame);
$('retryBtn').addEventListener('click', beginGame);
$('titleBest').textContent = bestText();

// Salvataggio del punteggio in classifica.
$('saveScore').addEventListener('click', onSaveScore);
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') onSaveScore(); });

// Pulsante mute.
const muteBtn = $('mute');
if (muteBtn) {
  muteBtn.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    const muted = sound.toggleMute();
    muteBtn.textContent = muted ? '🔇' : '🔊';
  });
}

const onResize = () => renderer.resize();
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

function handleEvents(now) {
  for (const e of game.drainEvents()) {
    switch (e.type) {
      case 'phase':
        if (e.phase === PHASES.PREVIEW) {
          // Nuovo livello: guardiano di nuovo nascosto, scossa "riarmata".
          playerMoved = false;
          renderer.hideGuardian();
        }
        break;
      case 'step':
        sound.step();
        if (!playerMoved) {
          // Primo passo dell'esploratore: il guardiano compare (fade + lampo).
          playerMoved = true;
          renderer.revealGuardian();
          flashScreen();
          if (quakeEnabled) { renderer.shake(7); vibrate(30); }
        }
        break;
      case 'villainStep':
        if (quakeEnabled && playerMoved) {
          renderer.shake(5); // pixel: scossa leggera
          vibrate(18);
        }
        break;
      case 'wrongStep':
        errorFlash = { key: cellKey(e.cell.x, e.cell.y), until: now + 350 };
        sound.error();
        vibrate(60);
        break;
      case 'powerUp':
        banner = { text: POWERUP_LABELS[e.kind] || 'Power-up', until: now + 1200 };
        sound.powerUp();
        vibrate([25, 40, 25]);
        break;
      case 'capture':
        banner = { text: 'CATTURATO!', until: now + 1500 };
        sound.capture();
        vibrate(120);
        break;
      case 'win':
        // Fermo immagine ~2s con scritta e suono, poi il livello successivo.
        banner = { text: 'LIVELLO ' + e.level + ' SUPERATO!', until: now + 2200, cls: 'win' };
        sound.win();
        winTimer = 2000;
        break;
      case 'gameOver': {
        const reached = game.level;
        if (reached > best) { best = reached; saveBest(best); }
        const why = e.reason === 'villainFinish' ? 'Il guardiano è arrivato al traguardo.' : 'Vite esaurite.';
        $('goResult').textContent = why + ' Sei arrivato al livello ' + reached + '.';
        $('goScore').textContent = 'Punteggio: ' + game.score;
        $('goBest').textContent = bestText();
        $('gameover').classList.remove('hidden');
        uiState = 'over';
        sound.gameOver();
        vibrate([80, 60, 80]);
        showLeaderboard(game.score); // carica classifica ed eventuale inserimento nome
        break;
      }
    }
  }
}

function renderHud(snap, now) {
  $('level').textContent = 'Livello ' + snap.level;
  $('phase').textContent = PHASE_LABEL[snap.phase] || snap.phase;

  // Vite: cuori pieni fino a snap.lives, "vuoti" fino al massimo da config.
  const n = Math.max(0, snap.lives);
  const empty = Math.max(0, CONFIG.lives.max - n);
  $('lives').innerHTML =
    `<span class="on">${'♥'.repeat(n)}</span><span class="off">${'♥'.repeat(empty)}</span>`;

  $('score').textContent = 'Punti: ' + snap.score;

  // Effetti attivi con countdown in secondi.
  const fx = [];
  if (snap.timers.freezeMs > 0) {
    fx.push(`<span class="fx freeze">❄ Gelo ${(snap.timers.freezeMs / 1000).toFixed(1)}s</span>`);
  }
  if (snap.timers.revealMs > 0) {
    fx.push(`<span class="fx reveal">◉ Rivelatore ${(snap.timers.revealMs / 1000).toFixed(1)}s</span>`);
  }
  $('effects').innerHTML = fx.join('');

  const b = $('banner');
  const show = now < banner.until;
  b.textContent = show ? banner.text : '';
  b.className = show ? (banner.cls || '') : '';
}

let last = performance.now();
function frame(now) {
  let dt = now - last;
  last = now;
  if (dt > 250) dt = 250; // clamp: evita salti enormi (scheda in background)

  // La logica avanza solo in gioco; su titolo/game over la scena resta ferma.
  if (uiState === 'playing') {
    game.update(dt);
    // Movimento continuo tenendo premuto: il core limita col cooldown.
    if (input.heldDir) game.movePlayer(input.heldDir);
    handleEvents(now);

    // Fine livello: fermo immagine, poi passa al livello successivo.
    if (winTimer > 0) {
      winTimer -= dt;
      if (winTimer <= 0) { winTimer = 0; game.nextLevel(); }
    }
  }

  const snap = game.getSnapshot();
  renderer.sync(snap, now, dt, errorFlash);
  renderHud(snap, now);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
