// Punto di ingresso del gioco 3D. Collega core (logica), render (Three.js) e
// input. Il loop usa un accumulatore su performance.now() con delta time.

import { CONFIG } from './config.js';
import { GameState, PHASES } from './core/gameState.js';
import { cellKey } from './core/grid.js';
import { POWERUP_LABELS } from './core/powerUps.js';
import { GameRenderer } from './render/scene.js';
import { createKeyboard } from './input/keyboard.js';
import { createTouchDpad } from './input/touch.js';

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
game.startGame();

// HUD (DOM). L'HUD completo è materia di Fase 4: qui il minimo per giocare.
const $ = (id) => document.getElementById(id);
let banner = { text: '', until: 0 };
let errorFlash = { key: null, until: 0 };

// Stato dell'input condiviso: `heldDir` è la direzione tenuta premuta (tastiera
// o D-Pad). Il core applica il cooldown, quindi si può chiamare movePlayer ad
// ogni frame senza timer nell'input.
const input = { heldDir: null };
const step = (dir) => game.movePlayer(dir);
const restart = () => { game.startGame(); banner = { text: '', until: 0 }; };

createKeyboard({ input, onPress: step, onRestart: restart });
createTouchDpad({ input, onPress: step, onRestart: restart });

const onResize = () => renderer.resize();
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

function handleEvents(now) {
  for (const e of game.drainEvents()) {
    switch (e.type) {
      case 'wrongStep':
        errorFlash = { key: cellKey(e.cell.x, e.cell.y), until: now + 350 };
        break;
      case 'powerUp':
        banner = { text: POWERUP_LABELS[e.kind] || 'Power-up', until: now + 1200 };
        break;
      case 'capture':
        banner = { text: 'CATTURATO!', until: now + 1500 };
        break;
      case 'win':
        banner = { text: 'LIVELLO ' + e.level + ' SUPERATO!', until: now + 1500 };
        game.nextLevel();
        break;
      case 'gameOver': {
        const why = e.reason === 'villainFinish' ? 'il villain è arrivato' : 'vite esaurite';
        banner = { text: 'GAME OVER — ' + why + ' (premi R)', until: Infinity };
        break;
      }
    }
  }
}

function renderHud(snap, now) {
  $('level').textContent = 'Livello ' + snap.level;
  $('phase').textContent = PHASE_LABEL[snap.phase] || snap.phase;
  $('lives').textContent = '♥'.repeat(Math.max(0, snap.lives)) || '—';
  $('banner').textContent = now < banner.until ? banner.text : '';
}

let last = performance.now();
function frame(now) {
  let dt = now - last;
  last = now;
  if (dt > 250) dt = 250; // clamp: evita salti enormi (scheda in background)

  game.update(dt);
  // Movimento continuo tenendo premuto: il core limita col cooldown.
  if (input.heldDir) game.movePlayer(input.heldDir);
  handleEvents(now);

  const snap = game.getSnapshot();
  renderer.sync(snap, now, errorFlash);
  renderHud(snap, now);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
