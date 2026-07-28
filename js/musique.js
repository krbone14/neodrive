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
  bpm = nom === 'menu' ? 84 : 128;
  gMus.gain.setTargetAtTime(nom === 'menu' ? 0.3 : 0.24, ac.currentTime, 0.1);
  if (nom === 'menu') droneMenu(); else nappeJeu();
  running = true;
  nextT = ac.currentTime + 0.12; step = 0;
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

// ----- Menu : lent, inquiétant -----
const ARP_MENU = [60, null, null, 63, null, 67, null, 66, 70, null, null, 67, null, 63, null, 66];
function pasMenu(s, t) {
  if (s === 0 || s === 8) subBasse(freq(36), t);
  if (s === 12) subBasse(freq(34), t);
  const m = ARP_MENU[s];
  if (m != null) pincer(freq(m), t, 0.14);
}
function droneMenu() {
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 6;
  const dg = ac.createGain(); dg.gain.value = 0.09; lp.connect(dg); dg.connect(gMus);
  [36, 43, 42].forEach((m, i) => {              // do, sol, fa# (triton)
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.value = freq(m); o.detune.value = (i - 1) * 6;
    o.connect(lp); o.start(); continus.push(o);
  });
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.06;
  const lg = ac.createGain(); lg.gain.value = 180;
  lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); continus.push(lfo);
}

// ----- Jeu : électro énergique -----
const BASS_JEU = [45, 45, null, 45, 48, null, 45, null, 43, 43, null, 43, 50, null, 47, null];
const LEAD_JEU = [69, null, 72, 76, null, 72, 69, 67, null, 69, 72, 74, 76, null, 72, 69];
function pasJeu(s, t, dur) {
  if (s % 4 === 0) kick(t);
  if (s % 2 === 0) hat(t, s % 8 === 4 ? 0.06 : 0.028);
  const b = BASS_JEU[s]; if (b != null) bassJeu(freq(b), t, dur * 1.7);
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
