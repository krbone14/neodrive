// ============================================================
//  intro.js — cinématique d'introduction (après COMMENCER)
//  Narration : voix française grave et lente (Web Speech).
//  Scènes vectorielles animées synchronisées au texte.
// ============================================================
import {
  debloquerAudio, arreterMusique, demarrerMusiqueMenu,
  sfxExplosion, sfxTir, sfxSpawn, sfxClic,
} from './musique.js';

const P = { cyan: '#00f0ff', magenta: '#ff00c8', violet: '#a020f0', or: '#ffd700', bleu: '#1b6ee0', blanc: '#eafcff' };

// Chaque segment : une scène animée + le texte dit par le général
const SEGMENTS = [
  { scene: 1, texte: "Nous sommes en l'an 2567. Un vortex est apparu aux alentours de la Lune." },
  { scene: 2, texte: "Une flotte de vaisseaux en est sortie pour attaquer la Terre. Nous étions perdus." },
  { scene: 3, texte: "Mais nous avons découvert une pierre puissante. Nous l'avons baptisée la Néo." },
  { scene: 4, texte: "Nous avons réussi à la transformer en tourelles, redoutables contre l'ennemi." },
  { scene: 5, texte: "Mais malheureusement, nous n'en avons pas assez." },
  { scene: 6, texte: "C'est pourquoi nous avons fait appel à vous. Avec ces armes, anéantissez l'ennemi." },
  { scene: 7, texte: "Vous êtes le dernier espoir de l'humanité. Vous êtes l'équipe Neodrive.",
    dit: "Vous êtes le dernier espoir de l'humanité. Vous êtes l'équipe" },   // « Neodrive » dit en anglais dans la finale
];

let cv, ctx, sub, etoiles = [];
let idx = 0, sceneNum = 1, sceneT0 = 0, animId = 0, fini = false;

// ----- Voix : homme français (grave, lent, fluide) + voix anglaise pour « Neodrive » -----
let voixFr = null, voixEn = null;
function chargerVoix() {
  if (!('speechSynthesis' in window)) return;
  const vs = window.speechSynthesis.getVoices();
  const fr = vs.filter(v => /^fr/i.test(v.lang));
  voixFr = fr.find(v => /thomas|paul|nicolas|guillaume|henri|mathieu|claude|r[eé]my|male|homme|man/i.test(v.name))
        || fr.find(v => /fr[-_]?FR/i.test(v.lang)) || fr[0] || null;
  const en = vs.filter(v => /^en/i.test(v.lang));
  voixEn = en.find(v => /daniel|david|george|james|alex|fred|male|man|guy/i.test(v.name)) || en[0] || null;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  chargerVoix();
  window.speechSynthesis.onvoiceschanged = chargerVoix;
}
function parler(texte, onend, opts = {}) {
  let dit = false;
  const done = () => { if (dit) return; dit = true; onend && onend(); };
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texte);
      u.voice = opts.voice || voixFr || null;
      u.lang = opts.lang || 'fr-FR';
      u.rate = opts.rate || 0.86;    // fluide
      u.pitch = opts.pitch != null ? opts.pitch : 0.2;   // très très grave
      u.volume = opts.volume != null ? opts.volume : 1;
      u.onend = done; u.onerror = done;
      window.speechSynthesis.speak(u);
    } catch (e) { /* le minuteur de secours prend le relais */ }
  }
  if (onend) {
    const secs = Math.max(2.6, texte.length * 0.075);
    setTimeout(done, secs * 1000 + 800);
  }
}

// ----- Lancement -----
export function lancerIntro() {
  debloquerAudio();      // dans le geste du clic : débloque le son pour la suite
  arreterMusique();      // silence : la voix au premier plan
  const ov = document.getElementById('intro');
  ov.style.display = 'block';
  cv = document.getElementById('cintro');
  ctx = cv.getContext('2d');
  sub = document.getElementById('soustitre');
  redim();
  window.addEventListener('resize', redim);
  document.getElementById('passer').onclick = allerAuJeu;
  fini = false; idx = 0;
  jouerSegment(0);
  boucle();
}
function redim() {
  if (!cv) return;
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  const n = Math.min(200, Math.floor(cv.width * cv.height / 8000));
  etoiles = [];
  for (let i = 0; i < n; i++) etoiles.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 1.6 + 0.3, v: Math.random() * 16 + 5, a: Math.random() * 0.6 + 0.3 });
}

function jouerSegment(k) {
  idx = k;
  sceneNum = SEGMENTS[k].scene;
  sceneT0 = performance.now();
  sub.textContent = SEGMENTS[k].texte;
  indicesSfx(sceneNum);
  parler(SEGMENTS[k].dit || SEGMENTS[k].texte, () => {
    if (idx !== k || fini) return;
    if (k >= SEGMENTS.length - 1) finale();
    else jouerSegment(k + 1);
  });
}

function indicesSfx(scene) {
  if (scene === 2) { sfxSpawn(); setTimeout(sfxExplosion, 600); }
  else if (scene === 3) sfxClic();
  else if (scene === 4) { sfxTir(); setTimeout(sfxTir, 300); }
  else if (scene === 6) { sfxExplosion(); setTimeout(sfxTir, 250); setTimeout(sfxExplosion, 700); }
}

function finale() {
  sceneNum = 7; sceneT0 = performance.now();
  sub.textContent = '';
  // « NEODRIVE » prononcé en anglais (sans écho), puis la musique prend le relais
  parler('Neo drive', null, { lang: 'en-US', voice: voixEn || voixFr, pitch: 0.2, rate: 0.86 });
  setTimeout(() => demarrerMusiqueMenu(), 1500);
  setTimeout(allerAuJeu, 4200);
}

function allerAuJeu() {
  if (fini) return;
  fini = true;
  try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  cancelAnimationFrame(animId);
  window.location.href = 'jeu.html';
}

// ============================================================
//  RENDU DES SCÈNES
// ============================================================
let dernier = performance.now();
function boucle() {
  animId = requestAnimationFrame(boucle);
  const now = performance.now();
  const dt = (now - dernier) / 1000; dernier = now;
  const w = cv.width, h = cv.height;
  ctx.fillStyle = '#05010f';
  ctx.fillRect(0, 0, w, h);
  dessinerEtoiles(dt);
  const t = (now - sceneT0) / 1000;
  const fade = Math.min(1, t / 0.5);                 // fondu d'entrée de scène
  ctx.save(); ctx.globalAlpha = fade;
  const S = { 1: scene1, 2: scene2, 3: scene3, 4: scene4, 5: scene5, 6: scene6, 7: scene7 }[sceneNum];
  if (S) S(w, h, t);
  ctx.restore();
}
function dessinerEtoiles(dt) {
  ctx.save(); ctx.fillStyle = P.blanc;
  for (const e of etoiles) {
    e.x -= e.v * dt; if (e.x < -2) { e.x = cv.width + 2; e.y = Math.random() * cv.height; }
    ctx.globalAlpha = e.a; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
  }
  ctx.restore();
}
const U = () => Math.min(cv.width, cv.height);   // unité d'échelle

// ----- Éléments réutilisables -----
function terre(cx, cy, R, t) {
  ctx.save();
  const atmo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.5);
  atmo.addColorStop(0, 'rgba(0,200,255,0.4)'); atmo.addColorStop(1, 'rgba(0,200,255,0)');
  ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, 7); ctx.fill();
  const oce = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  oce.addColorStop(0, '#3ab7ff'); oce.addColorStop(0.6, '#1461c8'); oce.addColorStop(1, '#08245c');
  ctx.fillStyle = oce; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
  const d = (t * 0.03) % 1;
  const conts = [[0.12, -0.3, 0.32], [0.4, 0.2, 0.26], [0.7, -0.1, 0.28]];
  for (const c of conts) for (let k = -1; k <= 1; k++) {
    const lon = ((c[0] + d) % 1) + k, x = cx - R + lon * 2 * R, y = cy + c[1] * R;
    ctx.fillStyle = '#2fae6b'; ctx.beginPath(); ctx.ellipse(x, y, c[2] * R, c[2] * R * 0.8, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = P.cyan; ctx.lineWidth = 1.5; ctx.shadowColor = P.cyan; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
  ctx.restore();
}
function lune(cx, cy, R) {
  ctx.save();
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
  g.addColorStop(0, '#d8d8e0'); g.addColorStop(1, '#6b6b78');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(80,80,95,0.6)';
  [[0.3, -0.2, 0.18], [-0.25, 0.1, 0.14], [0.1, 0.35, 0.1]].forEach(c => { ctx.beginPath(); ctx.arc(cx + c[0] * R, cy + c[1] * R, c[2] * R, 0, 7); ctx.fill(); });
  ctx.restore();
}
function vortex(cx, cy, R, t, scale) {
  if (scale <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
  const rot = t * 1.4;
  const halo = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.8);
  halo.addColorStop(0, 'rgba(160,32,240,0.5)'); halo.addColorStop(1, 'rgba(10,0,25,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, R * 1.8, 0, 7); ctx.fill();
  for (let b = 0; b < 3; b++) {
    const base = (b / 3) * 6.283; let prev = null;
    for (let i = 0; i <= 40; i++) {
      const f = i / 40, r = R * 0.3 + R * 1.4 * f, ang = base + f * 7 + rot;
      const pt = { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
      if (prev) {
        ctx.strokeStyle = f < 0.5 ? P.cyan : (f < 0.8 ? P.magenta : 'rgba(120,20,140,0.5)');
        ctx.lineWidth = 4 * (1 - f) + 1; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
      }
      prev = pt;
    }
  }
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R * 0.35, 0, 7); ctx.fill();
  ctx.strokeStyle = P.cyan; ctx.lineWidth = 2; ctx.shadowColor = P.cyan; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.35, 0, 7); ctx.stroke();
  ctx.restore();
}
function vaisseau(x, y, s, ang, couleur, forme) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = couleur; ctx.fillStyle = 'rgba(5,1,15,0.6)'; ctx.lineWidth = 2;
  ctx.shadowColor = couleur; ctx.shadowBlur = 10; ctx.beginPath();
  if (forme === 'losange') { ctx.moveTo(s * 1.5, 0); ctx.lineTo(0, s * 0.6); ctx.lineTo(-s * 1.5, 0); ctx.lineTo(0, -s * 0.6); }
  else if (forme === 'hexa') { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s, Math.sin(a) * s); } }
  else { ctx.moveTo(s * 1.5, 0); ctx.lineTo(-s * 0.8, s * 0.7); ctx.lineTo(-s * 0.4, 0); ctx.lineTo(-s * 0.8, -s * 0.7); }
  ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function cristal(cx, cy, s, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 0.5) * 0.15);
  const halo = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 2);
  halo.addColorStop(0, `rgba(0,150,255,${0.4 + 0.3 * pulse})`); halo.addColorStop(1, 'rgba(0,80,255,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, s * 2, 0, 7); ctx.fill();
  const pts = [[0, -s * 1.4], [s * 0.8, -s * 0.4], [s * 0.5, s * 1.3], [-s * 0.5, s * 1.3], [-s * 0.8, -s * 0.4]];
  const grad = ctx.createLinearGradient(0, -s, 0, s);
  grad.addColorStop(0, '#7fe8ff'); grad.addColorStop(0.5, P.cyan); grad.addColorStop(1, '#0a4fff');
  ctx.fillStyle = grad; ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 2;
  ctx.shadowColor = P.cyan; ctx.shadowBlur = 20 + 15 * pulse;
  ctx.beginPath(); pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(0, s * 1.3); ctx.moveTo(-s * 0.8, -s * 0.4); ctx.lineTo(s * 0.8, -s * 0.4); ctx.stroke();
  ctx.restore();
}
function tourelle(x, y, s, type, couleur, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = couleur; ctx.fillStyle = 'rgba(5,1,15,0.85)'; ctx.lineWidth = 2;
  ctx.shadowColor = couleur; ctx.shadowBlur = 12;
  if (type === 'laser') { ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = couleur; ctx.fillRect(s * 0.4, -s * 0.25, s, s * 0.5); }
  else if (type === 'plasma') { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s * 1.2, Math.sin(a) * s * 1.2); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, 7); ctx.fill(); ctx.stroke(); ctx.save(); ctx.rotate(t * 2); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, s * 1.4, k * 2.09, k * 2.09 + 1.9); ctx.stroke(); } ctx.restore(); }
  ctx.restore();
}

// ----- Les 7 scènes -----
function scene1(w, h, t) {
  terre(w * 0.3, h * 0.62, U() * 0.13, t);
  const mx = w * 0.66, my = h * 0.34, mR = U() * 0.06;
  lune(mx, my, mR);
  vortex(mx + mR * 2.6, my + mR * 0.4, U() * 0.09, t, Math.min(1, t / 2));
}
function scene2(w, h, t) {
  terre(w * 0.16, h * 0.55, U() * 0.13, t);
  vortex(w * 0.84, h * 0.42, U() * 0.11, t, 1);
  const formes = ['losange', 'hexa', 'triangle'], coul = [P.magenta, P.violet, P.cyan];
  for (let i = 0; i < 9; i++) {
    const prog = (t * 0.18 + i * 0.12) % 1.15;
    const x = w * 0.84 - prog * w * 0.7, y = h * 0.42 + Math.sin(i * 1.7) * h * 0.18 * (0.3 + prog);
    if (prog < 1.1) vaisseau(x, y, U() * 0.018, Math.PI, coul[i % 3], formes[i % 3]);
  }
}
function scene3(w, h, t) {
  cristal(w / 2, h * 0.46, U() * 0.15, t);
  ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = P.cyan; ctx.shadowColor = P.cyan; ctx.shadowBlur = 14;
  ctx.font = `bold ${Math.round(U() * 0.05)}px Segoe UI, sans-serif`;
  ctx.fillText('« LA NÉO »', w / 2, h * 0.82); ctx.restore();
}
function scene4(w, h, t) {
  cristal(w / 2, h * 0.45, U() * 0.1, t);
  const defs = [['laser', P.cyan, w * 0.28, h * 0.68], ['gravite', P.violet, w * 0.5, h * 0.76], ['plasma', P.magenta, w * 0.72, h * 0.68]];
  defs.forEach((d, i) => {
    const app = Math.min(1, Math.max(0, t - 0.4 - i * 0.5));
    if (app <= 0) return;
    ctx.save(); ctx.globalAlpha = app;
    ctx.strokeStyle = d[1]; ctx.lineWidth = 2; ctx.shadowColor = d[1]; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(w / 2, h * 0.45); ctx.lineTo(d[2], d[3]); ctx.stroke();
    tourelle(d[2], d[3], U() * 0.04 * app, d[0], d[1], t);
    ctx.restore();
  });
}
function scene5(w, h, t) {
  tourelle(w * 0.14, h * 0.4, U() * 0.045, 'laser', P.cyan, t);
  tourelle(w * 0.12, h * 0.62, U() * 0.045, 'plasma', P.magenta, t);
  const coul = [P.magenta, P.violet, P.cyan], formes = ['losange', 'hexa', 'triangle'];
  for (let i = 0; i < 26; i++) {
    const col = i % 6, row = Math.floor(i / 6);
    const x = w * 0.62 + col * U() * 0.06 + Math.sin(t + i) * 4;
    const y = h * 0.22 + row * U() * 0.11;
    vaisseau(x, y, U() * 0.016, Math.PI, coul[i % 3], formes[i % 3]);
  }
}
function scene6(w, h, t) {
  const tours = [[w * 0.13, h * 0.35, 'laser', P.cyan], [w * 0.11, h * 0.6, 'plasma', P.magenta], [w * 0.15, h * 0.82, 'gravite', P.violet]];
  const ennemis = [[w * 0.8, h * 0.3], [w * 0.86, h * 0.55], [w * 0.78, h * 0.78]];
  ennemis.forEach((e, i) => { if ((t + i * 0.3) % 1.2 > 0.9) explosion(e[0], e[1], U() * 0.06, ((t + i * 0.3) % 1.2 - 0.9) / 0.3); else vaisseau(e[0], e[1], U() * 0.02, Math.PI, P.magenta, 'losange'); });
  tours.forEach((to, i) => {
    tourelle(to[0], to[1], U() * 0.045, to[2], to[3], t);
    if ((t * 3 + i) % 1.5 < 0.6) { const e = ennemis[i % 3]; ctx.save(); ctx.strokeStyle = to[3]; ctx.lineWidth = 3; ctx.shadowColor = to[3]; ctx.shadowBlur = 12; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(to[0], to[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.restore(); }
  });
}
function explosion(x, y, R, f) {
  ctx.save(); ctx.globalAlpha = 1 - f; ctx.strokeStyle = P.or; ctx.lineWidth = 3; ctx.shadowColor = P.or; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(x, y, R * (0.3 + f * 2), 0, 7); ctx.stroke(); ctx.restore();
}
function scene7(w, h, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.save(); ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(234,252,255,0.7)';
  ctx.font = `${Math.round(U() * 0.035)}px Segoe UI, sans-serif`;
  ctx.fillText("L'ÉQUIPE", w / 2, h * 0.4);
  const grad = ctx.createLinearGradient(w * 0.2, 0, w * 0.8, 0);
  grad.addColorStop(0, P.cyan); grad.addColorStop(0.35, P.violet); grad.addColorStop(0.65, P.magenta); grad.addColorStop(1, P.or);
  ctx.fillStyle = grad; ctx.shadowColor = P.cyan; ctx.shadowBlur = 20 + 20 * pulse;
  ctx.font = `bold ${Math.round(U() * 0.13)}px Segoe UI, sans-serif`;
  ctx.fillText('NEODRIVE', w / 2, h * 0.56);
  // écho visuel
  ctx.globalAlpha = 0.25 * (1 - (t % 1));
  ctx.fillText('NEODRIVE', w / 2, h * 0.56);
  ctx.restore();
}
