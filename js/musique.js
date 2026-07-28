// ============================================================
//  musique.js — moteur audio : 2 musiques + effets sonores
//  Tout est généré (Web Audio API), aucun fichier externe.
//    · Menu : lente, inquiétante (do mineur + triton)
//    · Jeu  : électro énergique en fond (kick, basse, arpège)
// ============================================================
let ac = null, master = null, gMus = null, gSfx = null;
let muet = false, demarree = false;
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
export function estDemarree() { return demarree; }
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
  demarree = true;
  if (ac.state === 'suspended') ac.resume();
  if (piste === nom && running) return;
  arreterMusique();
  piste = nom;
  bpm = nom === 'menu' ? 120 : 126;
  gMus.gain.setTargetAtTime(0.27, ac.currentTime, 0.1);
  setupJeu();                       // même musique house pour le menu et le jeu
  if (nom === 'menu') introMenu();  // + intro (impact, montée, vraie voix)
  running = true;
  // au menu, la boucle démarre après l'intro parlée ; en jeu, tout de suite
  nextT = ac.currentTime + (nom === 'menu' ? 2.4 : 0.12); step = 0;
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
    pasJeu(step, nextT, dur);
    nextT += dur; step = (step + 1) % 16;
  }
  timer = setTimeout(planifier, 25);
}

// ----- Intro du menu : impact + montée -----
function introMenu() {
  const t = ac.currentTime + 0.05;
  kick(t);
  souffle(0.5, 'lowpass', 1600, 0.5, t);        // impact
  riser(t, 1.6);                                 // montée
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
