// ============================================================
//  rendu.js — dessin Canvas : fond étoilé, grille, trajectoire
//  Glow néon via shadowBlur (coûteux → à mettre en cache plus tard).
// ============================================================
import { PALETTE, GRILLE, LARGEUR, HAUTEUR, ETOILES, DECORS, ECONOMIE } from '../config.js';
import { CHEMIN } from './carte.js';
import { ETAT } from './etat.js';

// Fissures de la planète (générées une fois, déterministes)
const FISSURES = genererFissures();
function genererFissures() {
  const cracks = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.4 * Math.sin(i * 12.9898);
    const pts = [{ x: Math.cos(a0) * 0.08, y: Math.sin(a0) * 0.08 }];
    let ang = a0, r = 0.1;
    const seg = 4 + (i % 3);
    for (let s = 0; s < seg; s++) {
      ang += Math.sin(i * 3.1 + s * 7.7) * 0.55;   // zigzag déterministe
      r += (0.92 - 0.1) / seg;
      pts.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
    }
    cracks.push(pts);
  }
  return cracks;
}

// ----- Champ d'étoiles en parallaxe -------------------------
// Chaque étoile : x, y, taille, opacite, vitesse (px/s vers la gauche).
let couchesEtoiles = [];

export function initEtoiles() {
  couchesEtoiles = ETOILES.couches.map(couche => {
    const etoiles = [];
    for (let i = 0; i < couche.nombre; i++) {
      etoiles.push({
        x: Math.random() * LARGEUR,
        y: Math.random() * HAUTEUR,
      });
    }
    return { ...couche, etoiles };
  });
}

export function majEtoiles(dt) {
  for (const couche of couchesEtoiles) {
    for (const e of couche.etoiles) {
      e.x -= couche.vitesse * dt;
      if (e.x < -2) {
        e.x = LARGEUR + 2;
        e.y = Math.random() * HAUTEUR;
      }
    }
  }
}

// ----- Rendu par couches ------------------------------------
// Fond = tout ce qui passe SOUS les ennemis (espace, grille, piste).
export function dessinerFond(ctx) {
  ctx.fillStyle = PALETTE.fond;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  dessinerEtoiles(ctx);
  dessinerGrille(ctx);
  dessinerTrajectoire(ctx);
}

// Décors = trou noir + planète, dessinés PAR-DESSUS les ennemis
// (ils en surgissent à l'entrée et y disparaissent à la sortie).
export function dessinerDecors(ctx) {
  dessinerTrouNoir(ctx);
  dessinerPlanete(ctx);
}

// Frame complète sans ennemis (pratique pour tests / aperçu).
export function dessiner(ctx) {
  dessinerFond(ctx);
  dessinerDecors(ctx);
}

function dessinerEtoiles(ctx) {
  ctx.save();
  ctx.fillStyle = PALETTE.blanc;
  for (const couche of couchesEtoiles) {
    ctx.globalAlpha = couche.opacite;
    for (const e of couche.etoiles) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, couche.taille, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function dessinerGrille(ctx) {
  ctx.save();
  ctx.strokeStyle = PALETTE.grilleFaible;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= GRILLE.cols; c++) {
    const x = c * GRILLE.tailleCase;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HAUTEUR);
  }
  for (let r = 0; r <= GRILLE.rangs; r++) {
    const y = r * GRILLE.tailleCase;
    ctx.moveTo(0, y);
    ctx.lineTo(LARGEUR, y);
  }
  ctx.stroke();
  ctx.restore();
}

function dessinerTrajectoire(ctx) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Couche large et sombre (assise de la piste)
  ctx.strokeStyle = 'rgba(160, 32, 240, 0.20)';
  ctx.lineWidth = GRILLE.tailleCase * 0.8;
  tracerChemin(ctx);

  // Couche néon violette avec glow
  ctx.shadowColor = PALETTE.violet;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = PALETTE.violet;
  ctx.lineWidth = 4;
  tracerChemin(ctx);

  // Liseré cyan fin par-dessus
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = PALETTE.cyan;
  ctx.lineWidth = 1.5;
  tracerChemin(ctx);

  ctx.restore();
}

function tracerChemin(ctx) {
  ctx.beginPath();
  ctx.moveTo(CHEMIN[0].x, CHEMIN[0].y);
  for (let i = 1; i < CHEMIN.length; i++) {
    ctx.lineTo(CHEMIN[i].x, CHEMIN[i].y);
  }
  ctx.stroke();
}

// ----- Trou noir (point d'apparition) -----------------------
// Disque plat (≤ 1 case d'épaisseur) + bras spiraux de galaxie qui tournent.
function dessinerTrouNoir(ctx) {
  const cfg = DECORS.trouNoir;
  const R = cfg.rayon;
  const cx = CHEMIN[0].x + cfg.decalageX;
  const cy = CHEMIN[0].y;
  const aplat = cfg.aplatissement; // écrase la hauteur

  // Fin de partie : le vortex se referme sur lui-même (rétrécit + accélère)
  let facteur = 1, spin = 1;
  if (ETAT.statut !== 'enCours' && ETAT.tempsFin != null) {
    const e = (performance.now() - ETAT.tempsFin) / 1000;
    facteur = 1 - Math.min(1, e / 1.4);
    spin = 1 + (1 - facteur) * 7;
    if (facteur <= 0) { dessinerEtincelle(ctx, cx, cy, e - 1.4); return; }
  }

  const rot = (performance.now() / 1000) * cfg.vitesseRotation * spin;

  // Projette un point polaire sur le disque aplati (avec rotation globale)
  const px = (r, ang) => cx + Math.cos(ang + rot) * r;
  const py = (r, ang) => cy + Math.sin(ang + rot) * r * aplat;

  ctx.save();
  // Rétrécissement autour du centre (effondrement)
  ctx.translate(cx, cy);
  ctx.scale(facteur, facteur);
  ctx.translate(-cx, -cy);

  // Halo sombre et aplati (matière diffuse de la galaxie)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, aplat);
  const halo = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 2.2);
  halo.addColorStop(0,   'rgba(90, 30, 140, 0.45)');
  halo.addColorStop(0.5, 'rgba(45, 12, 80, 0.28)');
  halo.addColorStop(1,   'rgba(10, 0, 25, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, R * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Bras spiraux (spirale logarithmique), couleur chaude au centre → sombre au bord
  const PAS = 42;                    // points par bras
  const rInt = R * 0.42, rExt = R * 1.9;
  for (let b = 0; b < cfg.bras; b++) {
    const base = (b / cfg.bras) * Math.PI * 2;
    let prev = null;
    for (let i = 0; i <= PAS; i++) {
      const f = i / PAS;             // 0 = intérieur, 1 = extérieur
      const r = rInt + (rExt - rInt) * f;
      const ang = base + f * Math.PI * 2.3; // enroulement
      const pt = { x: px(r, ang), y: py(r, ang) };
      if (prev) {
        ctx.strokeStyle = couleurSpirale(f);
        ctx.lineWidth = 4 * (1 - f) + 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
      prev = pt;
    }
  }

  // Anneau interne brûlant (glow)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, aplat);
  ctx.strokeStyle = PALETTE.cyan;
  ctx.lineWidth = 3;
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
  ctx.stroke();

  // Horizon des événements : cœur noir
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.magenta;
  ctx.lineWidth = 2;
  ctx.shadowColor = PALETTE.magenta;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// Bref éclat lumineux quand le vortex a fini de se refermer
function dessinerEtincelle(ctx, cx, cy, e) {
  if (e < 0 || e > 0.4) return;
  const a = 1 - e / 0.4;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = PALETTE.cyan;
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, 6 * a, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Dégradé de couleur le long d'un bras spiral (chaud → sombre, fondu)
function couleurSpirale(f) {
  let r, g, b;
  if (f < 0.5) {           // cyan clair → magenta
    const k = f * 2;
    r = Math.round(120 + (255 - 120) * k);
    g = Math.round(240 + (60 - 240) * k);
    b = Math.round(255 + (200 - 255) * k);
  } else {                 // magenta → violet sombre
    const k = (f - 0.5) * 2;
    r = Math.round(255 + (90 - 255) * k);
    g = Math.round(60 + (20 - 60) * k);
    b = Math.round(200 + (140 - 200) * k);
  }
  const a = (0.85 * (1 - f) + 0.12).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ----- Planète (point d'arrivée) : la Terre, à plat ---------
function dessinerPlanete(ctx) {
  const cfg = DECORS.planete;
  const R = cfg.rayon;
  const cx = CHEMIN[CHEMIN.length - 1].x + cfg.decalageX;
  const cy = CHEMIN[CHEMIN.length - 1].y;
  const t = performance.now() / 1000;
  const defile = (t * cfg.vitesseRotation) % 1; // rotation de la Terre

  // Défaite : la planète explose (plus aucune vie)
  if (ETAT.statut === 'defaite' && ETAT.tempsFin != null) {
    dessinerExplosionPlanete(ctx, cx, cy, R, (performance.now() - ETAT.tempsFin) / 1000);
    return;
  }

  // Fraction de dégâts = proportion de vies perdues (0 = intacte, 1 = détruite)
  const degats = 1 - Math.max(0, Math.min(1, ETAT.vies / ECONOMIE.viesDepart));

  ctx.save();

  // Lueur atmosphérique cyan
  const atmo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.5);
  atmo.addColorStop(0, 'rgba(0, 200, 255, 0.4)');
  atmo.addColorStop(1, 'rgba(0, 200, 255, 0)');
  ctx.fillStyle = atmo;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Océans (dégradé bleu éclairé en haut-gauche)
  const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  ocean.addColorStop(0,   '#3ab7ff');
  ocean.addColorStop(0.6, '#1461c8');
  ocean.addColorStop(1,   '#08245c');
  ctx.fillStyle = ocean;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // Contenu de surface, rogné au disque
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Continents (défilent horizontalement + bouclage)
  const continents = [
    { lon: 0.10, lat: -0.35, rx: 0.34, ry: 0.28 },
    { lon: 0.28, lat:  0.25, rx: 0.26, ry: 0.34 },
    { lon: 0.52, lat: -0.15, rx: 0.30, ry: 0.24 },
    { lon: 0.70, lat:  0.35, rx: 0.22, ry: 0.20 },
    { lon: 0.85, lat: -0.30, rx: 0.28, ry: 0.26 },
  ];
  for (const c of continents) {
    for (let copie = -1; copie <= 1; copie++) {
      const lon = ((c.lon + defile) % 1) + copie;
      const x = cx - R + lon * 2 * R;
      const y = cy + c.lat * R;
      // masse principale (vert) + reflief plus sombre
      ctx.fillStyle = '#2fae6b';
      ctx.beginPath();
      ctx.ellipse(x, y, c.rx * R, c.ry * R, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(24, 110, 66, 0.9)';
      ctx.beginPath();
      ctx.ellipse(x + c.rx * R * 0.3, y + c.ry * R * 0.2, c.rx * R * 0.55, c.ry * R * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Calottes polaires
  ctx.fillStyle = 'rgba(235, 246, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(cx, cy - R * 0.92, R * 0.7, R * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + R * 0.92, R * 0.7, R * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nuages (défilent plus vite, translucides)
  const nuages = (t * cfg.vitesseRotation * 1.7) % 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let k = 0; k < 4; k++) {
    const lon = ((k / 4 + nuages) % 1);
    const x = cx - R + lon * 2 * R;
    const y = cy + Math.sin(k * 2.1) * R * 0.5;
    ctx.beginPath();
    ctx.ellipse(x, y, R * 0.4, R * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ombre du limbe (volume + terminateur côté droit)
  const ombre = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.3, cx, cy, R * 1.05);
  ombre.addColorStop(0, 'rgba(0, 0, 0, 0)');
  ombre.addColorStop(1, 'rgba(0, 0, 20, 0.55)');
  ctx.fillStyle = ombre;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // fin du rognage

  // Fissures (croissent au fur et à mesure des vies perdues)
  if (degats > 0) dessinerFissures(ctx, cx, cy, R, degats);

  // Liseré atmosphérique
  ctx.strokeStyle = PALETTE.cyan;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// Fissures incandescentes, rognées au disque, révélées selon les dégâts
function dessinerFissures(ctx, cx, cy, R, degats) {
  const n = Math.ceil(degats * FISSURES.length);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Assombrissement rougeâtre proportionnel
  ctx.fillStyle = `rgba(50, 0, 12, ${0.4 * degats})`;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  ctx.lineCap = 'round';
  for (let i = 0; i < n && i < FISSURES.length; i++) {
    const cr = FISSURES[i];
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(cx + cr[0].x * R, cy + cr[0].y * R);
      for (let k = 1; k < cr.length; k++) ctx.lineTo(cx + cr[k].x * R, cy + cr[k].y * R);
      ctx.stroke();
    };
    // Lueur orange
    ctx.strokeStyle = 'rgba(255, 120, 20, 0.9)';
    ctx.shadowColor = '#ff7a1a';
    ctx.shadowBlur = 9;
    ctx.lineWidth = 2.4;
    trace();
    // Cœur incandescent
    ctx.strokeStyle = 'rgba(255, 226, 140, 0.95)';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    trace();
  }
  ctx.restore();
}

// Explosion de la planète (défaite) : flash + anneaux néon échelonnés
function dessinerExplosionPlanete(ctx, cx, cy, R, e) {
  ctx.save();
  const couleurs = ['#ffd700', PALETTE.magenta, PALETTE.cyan, '#ff7a1a', PALETTE.magenta];
  // Flash initial
  if (e < 0.5) {
    ctx.globalAlpha = 1 - e / 0.5;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = PALETTE.or;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(cx, cy, R * (1 + e * 2.5), 0, Math.PI * 2);
    ctx.fill();
  }
  // Anneaux
  for (let i = 0; i < couleurs.length; i++) {
    const ti = e - i * 0.16;
    if (ti <= 0) continue;
    const f = ti / 0.95;
    if (f > 1) continue;
    ctx.globalAlpha = 1 - f;
    ctx.strokeStyle = couleurs[i];
    ctx.shadowColor = couleurs[i];
    ctx.shadowBlur = 22;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, R * (0.6 + f * 3.2), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
