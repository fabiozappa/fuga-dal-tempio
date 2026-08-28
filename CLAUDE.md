# Fuga Isometrica

Gioco browser 3D isometrico su griglia. Il giocatore memorizza un percorso durante
una breve anteprima, poi lo ripercorre a memoria mentre un villain lo insegue
avanzando a velocità costante lungo lo stesso tracciato.

Pilastri: **memoria visiva**, **inseguimento in tempo reale**, **risk vs. reward**
(le deviazioni per raccogliere power-up fanno perdere terreno).

---

## Vincoli tecnici — non negoziabili

- Vanilla JavaScript, ES modules nativi. **Nessun build step**, nessun bundler,
  nessun `npm run`. Si apre `index.html` da server locale e funziona.
- **Three.js** resta vendorizzata in locale (`assets/vendor/three.module.js`) e
  risolta via `importmap`. Il vincolo "funziona offline" è stato **rimosso**: gli
  asset (es. immagini di sfondo) possono essere **file locali caricati a runtime**,
  serviti dallo stesso dominio. Preferire comunque asset **locali** ai CDN esterni:
  alcuni ambienti dell'utente non raggiungono i CDN (es. `unpkg.com`).
- Nessun framework, nessuna libreria di utility, nessun TypeScript.
- **`src/core/` non importa mai Three.js.** La logica di gioco deve poter girare
  senza alcun renderer. Se una funzione in `core/` ha bisogno di sapere qualcosa
  sulla scena 3D, l'architettura è sbagliata.
- Tutti i numeri che riguardano il bilanciamento stanno in `src/config.js`.
  Nessun valore magico sparso nel codice.
- Il timing usa un accumulatore su `performance.now()` con delta time.
  **Mai `setTimeout` o `setInterval` per la cadenza di gioco**: si rompono quando
  la scheda del browser va in background, cosa frequentissima su mobile.
- Target primario: schermo verticale mobile. Il desktop è un di più.

---

## Struttura del progetto

```
/
├── CLAUDE.md
├── index.html          → gioco (Three.js)
├── debug.html          → vista di debug DOM, resta viva per sempre
├── src/
│   ├── config.js       → tutti i parametri di bilanciamento
│   ├── core/           → logica pura, zero dipendenze
│   │   ├── grid.js
│   │   ├── pathGenerator.js
│   │   ├── villain.js
│   │   ├── powerUps.js
│   │   └── gameState.js
│   ├── render/         → Three.js, legge lo stato e disegna
│   │   ├── scene.js
│   │   ├── camera.js
│   │   ├── tiles.js
│   │   ├── actors.js
│   │   ├── rocks.js    → massi irregolari procedurali sparsi attorno al sentiero
│   │   └── textures.js → texture procedurali su canvas (terra, roccia, terreno)
│   ├── input/
│   │   ├── keyboard.js
│   │   └── touch.js
│   ├── audio/
│   │   └── sound.js    → suoni procedurali (Web Audio, nessun file esterno)
│   └── main.js         → collega core + render + input
└── assets/
```

---

## Regole di gioco

### Griglia

- Larghezza fissa **W = 6** caselle.
- Lunghezza **H = 4 + (livello − 1)**.
- Il giocatore parte dalla riga 0, il traguardo è l'ultima riga.
- Il percorso corretto è una sequenza continua di caselle adiacenti dalla riga 0
  all'ultima riga (sono ammessi spostamenti laterali nel tracciato).
- Dal percorso principale si diramano **rami ciechi** di 1–3 caselle, con un
  power-up in fondo. Il numero di power-up è `floor(H / rowsPerPowerUp)` (di
  default uno ogni ~3 righe), distribuiti lungo la plancia.

### Fasi del round

1. **PREVIEW** — il percorso corretto si illumina (ciano il tracciato, ambra le
   deviazioni verso i rami, dorato i power-up) per la durata da config. Input
   disabilitato.
2. **FUGA** — tutto si spegne tranne le caselle già sbloccate. Il giocatore si
   muove. Il villain è fermo.
3. **INSEGUIMENTO** — scaduto il vantaggio iniziale, il villain parte e avanza a
   velocità costante lungo il percorso corretto.
4. **ESITO** — vittoria, cattura o game over.

### Movimento del giocatore

- WASD e frecce su desktop, D-Pad touch su mobile.
- Un passo per input, con un **cooldown** tra due passi (da config). Tenendo
  premuto si avanza a cadenza costante.
- Si può tornare liberamente su caselle già percorse: **è consentito muoversi in
  qualsiasi direzione** su caselle già sbloccate, senza penalità.
- Le caselle sbloccate **restano illuminate** per tutto il round.

### Villain

- Non copia i passi del giocatore. Percorre **sempre il percorso corretto**, dalla
  riga 0 al traguardo, un passo alla volta a velocità costante (`villainStepMs`).
- Parte dopo il vantaggio iniziale (`villainHeadStartMs`).
- Non subisce penalità, non sbaglia, non entra mai nei rami ciechi.
- È la ragione per cui deviare costa: il giocatore perde passi, il villain no.

### Penalità e fine round

| Evento | Effetto |
|---|---|
| Passo su casella sbagliata | −1 vita, lampeggio rosso della casella, il giocatore torna indietro di una posizione |
| Villain sulla stessa casella del giocatore | −1 vita, il giocatore torna alla casella iniziale, **anche il villain riparte dalla riga 0 e il vantaggio iniziale si riattiva** |
| Villain raggiunge il traguardo prima del giocatore | Game over immediato |
| Vite a 0 | Game over |
| Giocatore raggiunge l'ultima riga | Livello superato, si passa a H+1 |

Dopo una cattura le caselle già sbloccate **restano illuminate**: il giocatore
rifà la strada che conosce, non ricomincia a memoria da zero.

### Power-up

Sempre in fondo a un ramo cieco, mai sul percorso principale.

- **Vita Extra** — +1 vita, fino al massimo da config.
- **Gelo** — il villain resta immobile per la durata da config.
- **Rivelatore** — il percorso corretto si illumina di nuovo per la durata da config.

---

## Parametri di bilanciamento (`src/config.js`)

Valori di partenza. Vanno tarati giocando, non a tavolino.

```js
export const CONFIG = {
  grid:    { width: 6, baseHeight: 4 },
  timing: {
    previewMs:            3000,  // durata anteprima percorso
    villainHeadStartMs:   3000,  // vantaggio prima che il villain parta
    villainStepMs:         700,  // un passo del villain
    playerStepCooldownMs:  400,  // un passo del giocatore
  },
  lives:   { start: 3, max: 5 },
  powerUps:{ freezeMs: 4000, revealMs: 2500 },
  branches:{ rowsPerPowerUp: 3, minLength: 1, maxLength: 3 },
  // Curva di difficoltà: per livello il villain accelera e il vantaggio cala.
  difficulty:{ villainStepDecrementMs: 25, villainStepMinMs: 380,
               headStartDecrementMs: 150, headStartMinMs: 1200 },
};
```

**Il rapporto tra `playerStepCooldownMs` e `villainStepMs` è la manopola
principale del gioco.** A 400 vs 700 ms il giocatore è ~1,75× più veloce: corre,
recupera terreno, poi lo ricede quando devia. Un power-up in un ramo da 2 caselle
costa 4 passi, cioè 1,6 s, durante i quali il villain guadagna ~2,3 passi.

---

## Roadmap

Una fase per sessione. A fine fase: verifica manuale, poi commit.

### Fase 0 — Impalcatura
Struttura cartelle, `config.js` con tutti i parametri, `index.html` e `debug.html`
vuoti ma serviti correttamente, repo git inizializzato.
*Fatto quando:* la pagina si apre da server locale senza errori in console.

### Fase 1 — Motore, senza 3D
Tutto `src/core/`: generazione griglia, generazione percorso con rami ciechi,
macchina a stati delle 4 fasi, avanzamento villain, vite, penalità, condizioni di
vittoria e sconfitta. Più `debug.html` che disegna lo stato come griglia di `<div>`
colorati e permette di muoversi con la tastiera.
*Fatto quando:* si gioca un livello intero da `debug.html`, si vince, si perde per
cattura e si perde per villain arrivato al traguardo. Zero righe di Three.js.

### Fase 2 — Rendering isometrico
`src/render/`: scena, `OrthographicCamera` a 45°, tile della griglia, mesh di
giocatore e villain, materiali per gli stati della casella (spenta, sbloccata,
preview, errore, power-up). Il frustum si adatta al resize mantenendo le 6 colonne
sempre visibili.
*Fatto quando:* `index.html` mostra lo stesso identico gioco di `debug.html`, in 3D.
`debug.html` continua a funzionare.

### Fase 3 — Input e mobile
Cooldown dei passi, D-Pad touch, layout verticale, gestione del resize.
*Fatto quando:* il gioco è completabile da smartphone senza zoom né scroll.

### Fase 4 — Power-up
Piazzamento nei rami ciechi, raccolta, effetti di gelo e rivelatore, HUD con vite
ed effetti attivi.
*Fatto quando:* i tre power-up funzionano e sono visibili nell'HUD.

### Fase 5 — Juice
Animazione della preview, lampeggio rosso sull'errore, interpolazione morbida dei
movimenti, audio, vibrazione mobile su errore e raccolta.
*Fatto quando:* il gioco è piacevole da toccare, non solo corretto.

### Fase 6 — Progressione
Curva di difficoltà per livello, schermate di titolo e game over, persistenza del
record in `localStorage`.
*Fatto quando:* si può giocare dal livello 1 alla sconfitta senza ricaricare.

---

## Stato attuale

**Fase 6** — completata. Progressione: curva di difficoltà per livello
(`config.difficulty`: il villain accelera e il vantaggio cala fino a un limite),
schermate di titolo e game over (overlay DOM in `index.html`, macchina a stati
'title'/'playing'/'over' in `main.js`), record del livello massimo persistito in
localStorage. Si gioca dal livello 1 alla sconfitta senza ricaricare.

**Roadmap completata.** Prossimo lavoro (non ancora pianificato): direzione
artistica e grafica/personaggi — è una decisione ancora aperta, va scelto lo
stile prima di implementare.

---

## Decisioni ancora aperte

Non implementare nulla di questo senza che sia stato deciso esplicitamente.

- **Villain che supera il giocatore.** Se il giocatore è dentro un ramo cieco, il
  villain può sorpassarlo e proseguire lungo il percorso corretto — di fatto
  rivelandogli la strada da seguire. Valutare dopo la Fase 3 se è un problema o un
  meccanismo di recupero accettabile.
- ~~**Direzione artistica**~~: scelta — **tempio Inca abbandonato nella giungla**.
  Giocatore = esploratore/archeologo (cappello a tesa), villain = guardiano di
  pietra con occhi luminosi (procedurali). **Fondale**: immagine dipinta a schermo
  intero del cortile del tempio con statue Inca attorno (`assets/images/
  backgroundinca.png`, caricata a runtime, adattamento "cover"). Le **caselle**
  sono tile di **vetro smerigliato** (MeshPhysicalMaterial, transmission) con
  angoli stondati e dimensione irregolare (85–100% della cella) che si posano sul
  cortile e si illuminano come rune (giada = percorso, ambra = ramo, oro =
  power-up). Appena una casella è **percorsa**, il vetro diventa **lastra di
  pietra Inca** (`assets/images/incastone.png`, muratura poligonale seamless, UV
  variati per tile): il percorso si costruisce in pietra sotto i passi.
  `render/rocks.js` e le texture di terra/roccia non sono più usati (restano
  disponibili). In rifinitura.
- ~~**Difficoltà progressiva**~~: implementata in Fase 6 (`config.difficulty`):
  il villain accelera e il vantaggio iniziale cala per livello, fino a un limite.
- **Preview dinamica**: durata fissa o crescente con H.
- **Caselle speciali**: crepacci, teletrasporti, unidirezionali.
- **Monete, shop, skin**; modalità Survival / Time Attack.

---

## Come lavorare in questo repository

- Una fase alla volta. Non anticipare lavoro di fasi successive.
- Prima di scrivere codice nuovo, leggere `config.js`: se il valore serve al
  bilanciamento, va lì.
- `debug.html` non è usa e getta: va mantenuto funzionante fino alla fine. È il
  modo più veloce per capire se un bug sta nel motore o nel rendering.
- Commenti in italiano, nomi di variabili e funzioni in inglese.
- Se una regola di gioco in questo file è ambigua, chiedere prima di decidere.
