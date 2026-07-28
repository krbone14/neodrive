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
  bpm = nom === 'menu' ? 120 : 128;
  gMus.gain.setTargetAtTime(nom === 'menu' ? 0.28 : 0.24, ac.currentTime, 0.1);
  if (nom === 'menu') introMenu(); else nappeJeu();
  running = true;
  // la boucle du menu démarre APRÈS la voix (pour bien l'entendre), le jeu tout de suite
  nextT = ac.currentTime + (nom === 'menu' ? 2.8 : 0.12); step = 0;
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
  const dur = 1.35;
  // Bus voix dédié, branché sur le master (pas sur la musique) → bien en avant
  const voix = ac.createGain(); voix.gain.value = 1.6; voix.connect(master);

  const src = ac.createOscillator(); src.type = 'sawtooth';
  src.frequency.setValueAtTime(150, t0); src.frequency.linearRampToValueAtTime(120, t0 + dur);
  const src2 = ac.createOscillator(); src2.type = 'sawtooth'; src2.detune.value = -10;
  src2.frequency.setValueAtTime(150, t0); src2.frequency.linearRampToValueAtTime(120, t0 + dur);
  // léger vibrato pour la présence
  const vib = ac.createOscillator(); vib.frequency.value = 5.5; const vibg = ac.createGain(); vibg.gain.value = 4;
  vib.connect(vibg); vibg.connect(src.frequency); vibg.connect(src2.frequency); vib.start(t0); vib.stop(t0 + dur + 0.05);

  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(0.9, t0 + 0.06);   // NEE
  amp.gain.setValueAtTime(0.9, t0 + 0.52);            // OH
  amp.gain.linearRampToValueAtTime(0.2, t0 + 0.58);   // D (coupure)
  amp.gain.linearRampToValueAtTime(0.9, t0 + 0.68);   // dr-AH
  amp.gain.setValueAtTime(0.9, t0 + 1.05);            // -AI
  amp.gain.linearRampToValueAtTime(0.25, t0 + 1.13);  // V (coupure)
  amp.gain.linearRampToValueAtTime(0.7, t0 + 1.2);
  amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  const bande = () => { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 10; return f; };
  const f1 = bande(), f2 = bande(), f3 = bande();
  const seq = [                 // [temps, F1, F2, F3] pour chaque voyelle
    [t0,        300, 2300, 3000],  // ee
    [t0 + 0.32, 450,  850, 2600],  // oh
    [t0 + 0.66, 730, 1090, 2440],  // ah
    [t0 + 0.88, 350, 2200, 2900],  // ee (glide de « drive »)
    [t0 + 1.15, 300, 1000, 2200],  // v
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
  amp.connect(voix);

  // Consonnes : brefs bruits filtrés (n, d, r, v) — sur le bus voix
  const cons = (tt, cut, vol, d) => {
    const n = bruit(d); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = cut; bp.Q.value = 1;
    const cg = ac.createGain(); cg.gain.setValueAtTime(vol, tt); cg.gain.exponentialRampToValueAtTime(0.001, tt + d);
    n.connect(bp); bp.connect(cg); cg.connect(voix); n.start(tt); n.stop(tt + d + 0.02);
  };
  cons(t0,        1200, 0.18, 0.05);  // n
  cons(t0 + 0.58, 3200, 0.35, 0.04);  // d
  cons(t0 + 0.68, 1800, 0.16, 0.06);  // r
  cons(t0 + 1.13, 2600, 0.26, 0.10);  // v

  src.start(t0); src2.start(t0); src.stop(t0 + dur + 0.05); src2.stop(t0 + dur + 0.05);
}

// ----- Jeu : électro oldschool (chiptune) -----
// Basse en octaves qui saute (la mineur), arpège carré, batterie sèche.
const BASS_JEU = [33, 45, 33, 45, 36, 48, 36, 48, 31, 43, 31, 43, 40, 52, 40, 52];
const LEAD_JEU = [69, 72, 76, 72, 74, 72, 69, 67, 69, 72, 76, 79, 76, 74, 72, 69];
function pasJeu(s, t, dur) {
  if (s % 4 === 0) kick(t);
  if (s === 4 || s === 12) snare(t);        // caisse claire sur les temps 2 et 4
  if (s % 2 === 1) hat(t, 0.025);           // charleston sur les contretemps
  const b = BASS_JEU[s]; if (b != null) bassChip(freq(b), t, dur * 0.9);
  const l = LEAD_JEU[s]; if (l != null) leadJeu(freq(l), t);
}
function nappeJeu() {
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  const g = ac.createGain(); g.gain.value = 0.05; lp.connect(g); g.connect(gMus);
  [45, 52, 57].forEach((m, i) => {              // la mineur
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.value = freq(m); o.detune.value = (i - 1) * 5;
    o.connect(lp); o.start(); continus.push(o);
  });
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
function snare(t) {
  const n = bruit(0.16), hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
  const g = ac.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  n.connect(hp); hp.connect(g); g.connect(gMus); n.start(t); n.stop(t + 0.17);
  const o = ac.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.1);
  const og = ac.createGain(); og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(og); og.connect(gMus); o.start(t); o.stop(t + 0.13);
}
function bassChip(f, t, dur) {
  const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.Q.value = 6;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.26, t + 0.008);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.55, 0.03);
  o.connect(lp); lp.connect(g); g.connect(gMus); o.start(t); o.stop(t + dur);
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
