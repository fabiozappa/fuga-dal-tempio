// Input da tastiera — desktop. WASD e frecce muovono; R riavvia.
//
// Traccia i tasti direzionali tenuti premuti in uno stack: `input.heldDir` è la
// direzione attiva (l'ultima premuta ancora giù). Il loop di gioco legge
// heldDir ad ogni frame per la cadenza continua; onPress dà il passo immediato
// alla pressione. Il cooldown è applicato dal core.

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

export function createKeyboard({ input, onPress, onRestart }) {
  const pressed = []; // stack delle direzioni attualmente premute

  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'KeyR') {
      if (onRestart) onRestart();
      return;
    }
    const dir = KEYMAP[ev.code];
    if (!dir) return;
    ev.preventDefault();
    if (ev.repeat) return; // le ripetizioni dell'OS le gestisce il loop
    if (!pressed.includes(dir)) pressed.push(dir);
    input.heldDir = dir;
    if (onPress) onPress(dir); // passo immediato alla pressione
  });

  window.addEventListener('keyup', (ev) => {
    const dir = KEYMAP[ev.code];
    if (!dir) return;
    const i = pressed.indexOf(dir);
    if (i >= 0) pressed.splice(i, 1);
    input.heldDir = pressed.length ? pressed[pressed.length - 1] : null;
  });

  // Perdendo il focus, dimentica i tasti premuti (evita movimenti "fantasma").
  window.addEventListener('blur', () => {
    pressed.length = 0;
    input.heldDir = null;
  });
}
