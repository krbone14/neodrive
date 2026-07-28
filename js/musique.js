// ============================================================
//  musique.js — moteur audio : 2 musiques + effets sonores
//  Tout est généré (Web Audio API), aucun fichier externe.
//    · Menu : lente, inquiétante (do mineur + triton)
//    · Jeu  : électro énergique en fond (kick, basse, arpège)
// ============================================================
let ac = null, master = null, gMus = null, gSfx = null;
let muet = false;
let timer = null, running = false, piste = null;
let nextT = 0, step = 0, bpm = 120;
let continus = [];           // sources continues (drone/nappe) à arrêter
let gPump = null, delayJeu = null, barreJeu = 3;   // sidechain + écho + accord courant (jeu)
const dernier = {};          // limiteur pour les sons très fréquents

function assure() {
  if (ac) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muet ? 0 : 1; master.connect(ac.destination);
  gMus = ac.createGain(); gMus.gain.value = 0.3; gMus.connect(master);
  gSfx = ac.createGain(); gSfx.gain.value = 0.6; gSfx.connect(master);
}

const freq = m => 440 * Math.pow(2, (m - 69) / 12);

function bruit(dur) {
  const n = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = buf; return s;
}
function limite(nom, ms) {
  const n = performance.now();
  if (n - (dernier[nom] || 0) < ms) return false;
  dernier[nom] = n; return true;
}

export function estMuet() { return muet; }
export function basculerMuet() {
  muet = !muet;
  if (master) master.gain.setTargetAtTime(muet ? 0 : 1, ac.currentTime, 0.04);
  return muet;
}

// ============================================================
//  MUSIQUES
// ============================================================
export function demarrerMusiqueMenu() { demarrer('menu'); }
export function demarrerMusiqueJeu() { demarrer('jeu'); }

function demarrer(nom) {
  assure(); if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  if (piste === nom && running) return;
  arreterMusique();
  piste = nom;
  bpm = nom === 'menu' ? 120 : 126;
  gMus.gain.setTargetAtTime(nom === 'menu' ? 0.28 : 0.27, ac.currentTime, 0.1);
  if (nom === 'menu') introMenu(); else setupJeu();
  running = true;
  // la boucle du menu démarre APRÈS la voix (pour bien l'entendre), le jeu tout de suite
  nextT = ac.currentTime + (nom === 'menu' ? 3.9 : 0.12); step = 0;
  planifier();
}

export function arreterMusique() {
  running = false;
  if (timer) { clearTimeout(timer); timer = null; }
  continus.forEach(n => { try { n.stop(); } catch (e) { /* déjà arrêté */ } });
  continus = [];
}

function planifier() {
  if (!running) return;
  const dur = (60 / bpm) / 4;   // durée d'une double-croche
  while (nextT < ac.currentTime + 0.12) {
    (piste === 'menu' ? pasMenu : pasJeu)(step, nextT, dur);
    nextT += dur; step = (step + 1) % 16;
  }
  timer = setTimeout(planifier, 25);
}

// ----- Menu : intro électro + boucle entraînante + voix « NEODRIVE » -----
const BASS_MENU = [43, 43, null, 43, 46, null, 43, null, 41, 41, null, 41, 48, null, 45, null];
const LEAD_MENU = [67, null, 70, 74, null, 70, 67, 65, null, 67, 70, 72, 74, null, 70, 67];
function pasMenu(s, t, dur) {
  if (s % 4 === 0) kick(t);
  if (s % 2 === 0) hat(t, s % 8 === 4 ? 0.06 : 0.028);
  const b = BASS_MENU[s]; if (b != null) bassJeu(freq(b), t, dur * 1.7);
  const l = LEAD_MENU[s]; if (l != null) leadJeu(freq(l), t);
}

// Séquence d'ouverture : impact + montée + voix, puis nappe continue
function introMenu() {
  const t = ac.currentTime + 0.05;
  kick(t);
  souffle(0.5, 'lowpass', 1600, 0.5, t);        // impact
  riser(t, 1.2);                                 // montée
  voixNeodrive(t + 1.0);                          // « NEODRIVE » au sommet
  // Nappe continue (la mineur) sous la boucle
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
  const g = ac.createGain(); g.gain.value = 0.05; lp.connect(g); g.connect(gMus);
  [43, 50, 55].forEach((m, i) => {
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.value = freq(m); o.detune.value = (i - 1) * 5;
    o.connect(lp); o.start(); continus.push(o);
  });
}

// Montée de tension (bruit filtré + ton ascendant)
function riser(t, dur) {
  const s = bruit(dur); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1;
  bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(6000, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + dur * 0.9);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.15);
  s.connect(bp); bp.connect(g); g.connect(gMus); s.start(t); s.stop(t + dur + 0.2);
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(900, t + dur);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(0.12, t + dur * 0.9);
  og.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.1);
  o.connect(og); og.connect(gMus); o.start(t); o.stop(t + dur + 0.15);
}

// Voix robotique « NEODRIVE » par synthèse de formants (voyelles ee-oh-ah-ee + consonnes)
function voixNeodrive(t0) {
  const dur = 2.5;
  // Bus voix (sec) branché sur le master → bien en avant
  const voix = ac.createGain(); voix.gain.value = 1.6; voix.connect(master);
  // Réverbe/écho pour faire RÉSONNER « drive »
  const rev = ac.createDelay(0.8); rev.delayTime.value = 0.34;
  const rfb = ac.createGain(); rfb.gain.value = 0.55;
  const rlp = ac.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 2600;
  rev.connect(rlp); rlp.connect(rfb); rfb.connect(rev); rev.connect(master);
  const wet = ac.createGain(); wet.gain.value = 0.15; wet.connect(rev);
  // La résonance monte fort sur « DRIVE »
  wet.gain.setValueAtTime(0.15, t0 + 1.3);
  wet.gain.linearRampToValueAtTime(0.9, t0 + 1.5);

  const src = ac.createOscillator(); src.type = 'sawtooth';
  src.frequency.setValueAtTime(148, t0); src.frequency.linearRampToValueAtTime(120, t0 + dur);
  const src2 = ac.createOscillator(); src2.type = 'sawtooth'; src2.detune.value = -10;
  src2.frequency.setValueAtTime(148, t0); src2.frequency.linearRampToValueAtTime(120, t0 + dur);
  const vib = ac.createOscillator(); vib.frequency.value = 5; const vibg = ac.createGain(); vibg.gain.value = 3.5;
  vib.connect(vibg); vibg.connect(src.frequency); vibg.connect(src2.frequency); vib.start(t0); vib.stop(t0 + dur + 0.05);

  // Enveloppe lente, syllabes bien séparées : NÉ — O — DRIVE
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(0.9, t0 + 0.08);   // NÉ
  amp.gain.setValueAtTime(0.9, t0 + 0.52);
  amp.gain.linearRampToValueAtTime(0.1, t0 + 0.62);   // (silence)
  amp.gain.linearRampToValueAtTime(0.9, t0 + 0.72);   // O
  amp.gain.setValueAtTime(0.9, t0 + 1.18);
  amp.gain.linearRampToValueAtTime(0.1, t0 + 1.3);    // (silence avant D)
  amp.gain.linearRampToValueAtTime(0.9, t0 + 1.42);   // DRIVE (long)
  amp.gain.setValueAtTime(0.9, t0 + 2.05);
  amp.gain.linearRampToValueAtTime(0.5, t0 + 2.2);    // V
  amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  const bande = () => { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 11; return f; };
  const f1 = bande(), f2 = bande(), f3 = bande();
  const seq = [                    // [temps, F1, F2, F3] — voyelles tenues puis transitions
    [t0,        300, 2300, 3000],  // é (NÉ)
    [t0 + 0.55, 300, 2300, 3000],
    [t0 + 0.72, 450,  850, 2600],  // o (O)
    [t0 + 1.20, 450,  850, 2600],
    [t0 + 1.45, 730, 1090, 2440],  // a (DR-A)
    [t0 + 1.85, 730, 1090, 2440],
    [t0 + 2.02, 350, 2200, 2900],  // i (-AÏ)
    [t0 + 2.2,  300, 1000, 2200],  // v
  ];
  [f1, f2, f3].forEach((f, i) => {
    f.frequency.setValueAtTime(seq[0][i + 1], t0);
    for (let k = 1; k < seq.length; k++) f.frequency.linearRampToValueAtTime(seq[k][i + 1], seq[k][0]);
  });
  const g1 = ac.createGain(), g2 = ac.createGain(), g3 = ac.createGain();
  g1.gain.value = 1.0; g2.gain.value = 0.9; g3.gain.value = 0.5;
  [src, src2].forEach(s => { s.connect(f1); s.connect(f2); s.connect(f3); });
  f1.connect(g1); f2.connect(g2); f3.connect(g3);
  g1.connect(amp); g2.connect(amp); g3.connect(amp);
  amp.connect(voix); amp.connect(wet);   // sec + réverbe

  // Consonnes : brefs bruits filtrés (n, d, r, v)
  const cons = (tt, cut, vol, d, versRev) => {
    const n = bruit(d); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = cut; bp.Q.value = 1;
    const cg = ac.createGain(); cg.gain.setValueAtTime(vol, tt); cg.gain.exponentialRampToValueAtTime(0.001, tt + d);
    n.connect(bp); bp.connect(cg); cg.connect(voix); if (versRev) cg.connect(wet);
    n.start(tt); n.stop(tt + d + 0.02);
  };
  cons(t0,        1200, 0.18, 0.05);          // n
  cons(t0 + 1.32, 3200, 0.4, 0.05, true);     // d (dans « drive »)
  cons(t0 + 1.42, 1800, 0.18, 0.07, true);    // r
  cons(t0 + 2.2,  2600, 0.28, 0.12, true);    // v

  src.start(t0); src2.start(t0); src.stop(t0 + dur + 0.05); src2.stop(t0 + dur + 0.05);
}

// ----- Jeu : progressive / melodic house (esprit deadmau5) -----
// Progression Am – F – C – G. Pump (sidechain) sur le kick, plucks + nappe + sub.
const CHORDS = [
  { sub: 33, triad: [45, 48, 52], notes: [45, 48, 52, 57, 60] }, // Am
  { sub: 29, triad: [41, 45, 48], notes: [41, 45, 48, 53, 57] }, // F
  { sub: 36, triad: [48, 52, 55], notes: [48, 52, 55, 60, 64] }, // C
  { sub: 31, triad: [43, 47, 50], notes: [43, 47, 50, 55, 59] }, // G
];
const PLUCK = [0, 2, 4, 2, 3, 2, 1, 2, 0, 2, 4, 3, 1, 2, 4, 2];  // arpège roulant (indices d'accord)

function setupJeu() {
  gPump = ac.createGain(); gPump.gain.value = 1; gPump.connect(gMus);
  delayJeu = ac.createDelay(0.6);
  delayJeu.delayTime.value = (60 / bpm) / 4 * 3;   // écho pointé pour les plucks
  const fb = ac.createGain(); fb.gain.value = 0.3;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
  delayJeu.connect(lp); lp.connect(fb); fb.connect(delayJeu); delayJeu.connect(gPump);
  barreJeu = 3;
}
function pasJeu(s, t, dur) {
  if (s === 0) barreJeu = (barreJeu + 1) % 4;
  const ch = CHORDS[barreJeu];
  if (s % 4 === 0) { kick(t); pump(t); }              // 4-on-the-floor + sidechain
  if (s % 2 === 1) hat(t, 0.022);                     // charleston contretemps
  if (s === 0) padChord(ch.triad, t, dur * 16);       // nappe d'accord (1 mesure)
  if (s === 0 || s === 6 || s === 8 || s === 14) subJeu(freq(ch.sub), t, dur * 1.6);
  pluckJeu(freq(ch.notes[PLUCK[s]]), t);              // arpège continu
}
// Sidechain : « pompe » sur le bus mélodique à chaque kick
function pump(t) {
  gPump.gain.cancelScheduledValues(t);
  gPump.gain.setValueAtTime(0.3, t);
  gPump.gain.linearRampToValueAtTime(1, t + 0.22);
}
function padChord(triad, t, dur) {
  triad.forEach((m, i) => {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq(m); o.detune.value = (i - 1) * 6;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.15);
    g.gain.setValueAtTime(0.06, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(gPump); o.start(t); o.stop(t + dur + 0.05);
  });
}
function pluckJeu(f, t) {
  const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(800, t + 0.18);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(lp); lp.connect(g); g.connect(gPump); g.connect(delayJeu);
  o.start(t); o.stop(t + 0.22);
}
function subJeu(f, t, dur) {
  const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.4, t + 0.01);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.6, 0.04);
  o.connect(g); g.connect(gPump); o.start(t); o.stop(t + dur);
}

// ----- Instruments -----
function kick(t) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g); g.connect(gMus); o.start(t); o.stop(t + 0.17);
}
function hat(t, dur) {
  const s = bruit(dur + 0.02), hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
  const g = ac.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(hp); hp.connect(g); g.connect(gMus); s.start(t); s.stop(t + dur + 0.02);
}
function bassJeu(f, t, dur) {
  const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800; lp.Q.value = 3;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.01);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.6, 0.04);
  o.connect(lp); lp.connect(g); g.connect(gMus); o.start(t); o.stop(t + dur);
}
function leadJeu(f, t) {
  const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(g); g.connect(gMus); o.start(t); o.stop(t + 0.18);
}
function subBasse(f, t) {
  const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o.connect(g); g.connect(gMus); o.start(t); o.stop(t + 0.6);
}
function pincer(f, t, vol) {
  const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.5; bp.Q.value = 4;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(bp); bp.connect(g); g.connect(gMus); o.start(t); o.stop(t + 0.55);
}

// ============================================================
//  EFFETS SONORES (vers gSfx)
// ============================================================
function ton(type, f0, f1, t, dur, vol) {
  const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(gSfx); o.start(t); o.stop(t + dur + 0.02);
}
function souffle(dur, type, cut, vol, t) {
  const s = bruit(dur), f = ac.createBiquadFilter(); f.type = type; f.frequency.value = cut;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(gSfx); s.start(t); s.stop(t + dur + 0.02);
}

export function sfxClic()        { if (!ac) return; ton('square', 880, 1250, ac.currentTime, 0.06, 0.18); }
export function sfxPose()        { if (!ac) return; const t = ac.currentTime; ton('sine', 320, 150, t, 0.12, 0.3); souffle(0.08, 'lowpass', 500, 0.15, t); }
export function sfxAmelioration(){ if (!ac) return; const t = ac.currentTime; [0, 0.06, 0.12].forEach((d, i) => ton('square', 600 + i * 260, null, t + d, 0.1, 0.16)); }
export function sfxPoubelle()    { if (!ac) return; const t = ac.currentTime; for (let i = 0; i < 4; i++) souffle(0.05, 'bandpass', 1200 + Math.random() * 1600, 0.18, t + i * 0.05); ton('square', 500, 170, t, 0.18, 0.14); }
export function sfxTir()         { if (!ac || !limite('tir', 70)) return; ton('sawtooth', 1500, 500, ac.currentTime, 0.09, 0.08); }
export function sfxSpawn()       { if (!ac || !limite('spawn', 60)) return; ton('sine', 110, 440, ac.currentTime, 0.18, 0.12); }
export function sfxMort()        { if (!ac || !limite('mort', 35)) return; const t = ac.currentTime; ton('square', 520, 120, t, 0.12, 0.12); souffle(0.1, 'highpass', 2200, 0.1, t); }
export function sfxFissure()     { if (!ac) return; const t = ac.currentTime; souffle(0.12, 'bandpass', 2600, 0.4, t); ton('square', 260, 90, t, 0.14, 0.22); } // « crac »
export function sfxExplosion()   { if (!ac) return; const t = ac.currentTime; souffle(0.6, 'lowpass', 1400, 0.55, t); ton('sine', 130, 40, t, 0.5, 0.55); }
export function sfxDefaite()     { if (!ac) return; const t = ac.currentTime; [57, 54, 50, 45].forEach((m, i) => ton('sawtooth', freq(m), null, t + i * 0.18, 0.42, 0.22)); }
export function sfxVictoire()    { if (!ac) return; const t = ac.currentTime; [60, 64, 67, 72, 76].forEach((m, i) => ton('square', freq(m), null, t + i * 0.11, 0.34, 0.2)); }
