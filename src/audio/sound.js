// Audio procedurale — Web Audio API. Nessun file esterno: i suoni sono
// sintetizzati al volo (coerente col vincolo no-build / no-rete).
//
// Il contesto audio va creato/ripreso dopo un gesto dell'utente (policy di
// autoplay dei browser): chiamare resume() al primo input.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Crea il contesto se serve e lo riattiva (da chiamare al primo input).
  resume() {
    if (this.muted) return;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Suona una singola nota con inviluppo, per evitare click.
  // opt: { freq, dur, type, gain, slideTo, delay }
  tone(opt) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + (opt.delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opt.type || 'sine';
    osc.frequency.setValueAtTime(opt.freq, t0);
    if (opt.slideTo) osc.frequency.exponentialRampToValueAtTime(opt.slideTo, t0 + opt.dur);
    const peak = opt.gain != null ? opt.gain : 0.15;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opt.dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + opt.dur + 0.02);
  }

  // Sequenza di note (arpeggio).
  sequence(notes, step = 0.09, base = {}) {
    notes.forEach((freq, i) => this.tone({ ...base, freq, delay: i * step }));
  }

  step()    { this.tone({ freq: 320, dur: 0.05, type: 'square', gain: 0.05 }); }
  error()   { this.tone({ freq: 150, dur: 0.28, type: 'sawtooth', gain: 0.16, slideTo: 70 }); }
  powerUp() { this.sequence([523, 659, 784, 1046], 0.07, { dur: 0.14, type: 'triangle', gain: 0.12 }); }
  capture() { this.tone({ freq: 380, dur: 0.35, type: 'sawtooth', gain: 0.16, slideTo: 90 }); }
  win()     { this.sequence([523, 659, 784, 1046, 1318], 0.1, { dur: 0.2, type: 'triangle', gain: 0.13 }); }
  gameOver(){ this.sequence([392, 330, 262, 196], 0.16, { dur: 0.3, type: 'sine', gain: 0.14 }); }
}
