// Input touch — D-Pad per mobile. Aggancia i listener ai pulsanti già presenti
// nel DOM (elementi con data-dir e il pulsante #restart).
//
// Alla pressione di un tasto imposta `input.heldDir` e dà il passo immediato
// (onPress); il loop di gioco continua alla cadenza del cooldown finché resta
// premuto. Il rilascio è gestito a livello di window, così la direzione si
// azzera sempre — anche se il dito scivola fuori dal pulsante (nessun rischio
// di movimento "incantato").

export function createTouchDpad({ input, onPress, onRestart, root = document }) {
  const buttons = Array.from(root.querySelectorAll('[data-dir]'));

  const releaseAll = () => {
    input.heldDir = null;
    for (const b of buttons) b.classList.remove('active');
  };

  for (const btn of buttons) {
    btn.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      releaseAll();
      input.heldDir = btn.dataset.dir;
      btn.classList.add('active');
      if (onPress) onPress(btn.dataset.dir);
    });
  }

  // Il rilascio arriva ovunque avvenga: garantisce l'azzeramento.
  window.addEventListener('pointerup', releaseAll);
  window.addEventListener('pointercancel', releaseAll);

  const restart = document.getElementById('restart');
  if (restart) {
    restart.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      if (onRestart) onRestart();
    });
  }
}
