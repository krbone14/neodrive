// ============================================================
//  musique.js — ambiance électro inquiétante générée en direct
//  (Web Audio API, aucun fichier externe). Do mineur + triton.
// ============================================================
let ac = null, master = null, delay = null;
let muet = false, running = false, timer = null;
let nextStepTime = 0, step = 0;

const BPM = 84;
const STEP = (60 / BPM) / 4;             // durée d'une double-croche
const freq = m => 440 * Math.pow(2, (m - 69) / 12);

// Arpège sur 16 pas : do mineur + triton (F#) → tension
const ARP = [60, null, null, 63, null, 67, null, 66, 70, null, null, 67, null, 63, null, 66];

export function estMuet() { return muet; }

export function basculerMuet() {
  muet = !muet;
  if (master) master.gain.setTargetAtTime(muet ? 0 : 0.32, ac.currentTime, 0.05);
  return muet;
}

// Démarre la musique (à appeler depuis un geste utilisateur : autoplay)
export function demarrerMusique() {
  if (running) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muet ? 0 : 0.32;
  master.connect(ac.destination);

  // Écho filtré (espace)
  delay = ac.createDelay(1.0);
  delay.delayTime.value = STEP * 2;
  const fb = ac.createGain(); fb.gain.value = 0.33;
  const lpEcho = ac.createBiquadFilter(); lpEcho.type = 'lowpass'; lpEcho.frequency.value = 1800;
  delay.connect(lpEcho); lpEcho.connect(fb); fb.connect(delay); delay.connect(master);

  droneEtVent();
  running = true;
  if (ac.state === 'suspended') ac.resume();
  nextStepTime = ac.currentTime + 0.15;
  step = 0;
  planifier();
}

// Ordonnanceur avec anticipation
function planifier() {
  while (nextStepTime < ac.currentTime + 0.12) {
    jouerPas(step, nextStepTime);
    nextStepTime += STEP;
    step = (step + 1) % 16;
  }
  timer = setTimeout(planifier, 25);
}

function jouerPas(s, t) {
  if (s === 0 || s === 8) basse(freq(36), t);   // pulsation grave (do)
  if (s === 12) basse(freq(34), t);             // note plus basse (tension)
  const m = ARP[s];
  if (m != null) pincer(freq(m), t);
}

// Basse sub + harmonique
function basse(f, t) {
  const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
  const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  const g2 = ac.createGain(); g2.gain.value = 0.12;
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
  o.start(t); o2.start(t); o.stop(t + 0.6); o2.stop(t + 0.6);
}

// Note d'arpège (pincée, avec écho)
function pincer(f, t) {
  const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.5; bp.Q.value = 4;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(bp); bp.connect(g); g.connect(master); g.connect(delay);
  o.start(t); o.stop(t + 0.55);
}

// Drone continu (do + quinte + triton) + souffle filtré
function droneEtVent() {
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 6;
  const dg = ac.createGain(); dg.gain.value = 0.09; lp.connect(dg); dg.connect(master);
  [36, 43, 42].forEach((m, i) => {           // do, sol, fa# (triton) très graves
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq(m);
    o.detune.value = (i - 1) * 6;            // léger désaccord → épaisseur
    o.connect(lp); o.start();
  });
  // LFO lent sur la fréquence de coupure (respiration)
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.06;
  const lg = ac.createGain(); lg.gain.value = 180;
  lfo.connect(lg); lg.connect(lp.frequency); lfo.start();

  // Souffle : bruit blanc filtré, très discret, coupure ondulante
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.7;
  const ng = ac.createGain(); ng.gain.value = 0.04;
  src.connect(bp); bp.connect(ng); ng.connect(master); src.start();
  const nlfo = ac.createOscillator(); nlfo.frequency.value = 0.08;
  const nlg = ac.createGain(); nlg.gain.value = 300;
  nlfo.connect(nlg); nlg.connect(bp.frequency); nlfo.start();
}
