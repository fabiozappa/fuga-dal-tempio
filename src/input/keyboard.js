// Input da tastiera — desktop. WASD e frecce muovono; R riavvia.
// Un passo per pressione. Il cooldown e il D-Pad touch sono roba di Fase 3.

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

// Registra i listener. onMove(direction) ad ogni passo, onRestart() su R.
export function createKeyboard({ onMove, onRestart }) {
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'KeyR') {
      if (onRestart) onRestart();
      return;
    }
    const dir = KEYMAP[ev.code];
    if (dir) {
      ev.preventDefault();
      onMove(dir);
    }
  });
}
