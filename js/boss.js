// ============================================================
//  boss.js — LE DREADNOUGHT (vague 10)
//  Bouclier régénérant · immunisé au ralentissement · ponte
//  d'éclaireurs · entrée zoom+tremblement · explosion multi-phases
// ============================================================
import { BOSS as CFG, PALETTE, LARGEUR, HAUTEUR } from '../config.js';
import { CHEMIN, CENTRE_TROU } from './carte.js';
import { ajouterEnnemi, creerEnnemi } from './ennemis.js';
import { ETAT } from './etat.js';

let bossActuel = null;
let tempsEntree = 0;             // cinématique d'entrée (zoom + tremblement)
const DUREE_ENTREE = 1.6;
let minuterieEclaireurs = 0;
let enExplosion = false;
let tempsExplosion = 0;
let explosions = [];            // anneaux d'explosion échelonnés

export function reinitBoss() {
  bossActuel = null;
  tempsEntree = 0;
  enExplosion = false;
  tempsExplosion = 0;
  explosions = [];
}

export function bossPresent() {
  return !!bossActuel;
}

// Crée le boss et l'enregistre dans la liste des ennemis (ciblable par les tours)
export function creerBoss() {
  const b = {
    type: 'dreadnought', estBoss: true,
    def: { gain: CFG.gain, degatsBase: 9999 },   // atteint la base = mort instantanée
    chemin: CHEMIN, cible: 1,
    x: CENTRE_TROU.x, y: CENTRE_TROU.y,   // sort du vortex
    pv: CFG.coque, pvMax: CFG.coque,
    bouclier: CFG.bouclier, bouclierMax: CFG.bouclier,
    tempsSansDegat: 0,
    vitesse: CFG.vitesse,
    ralenti: 1, immuniseRalenti: true,
    angle: 0, vivant: true, arrive: false, tue: false,
  };
  bossActuel = b;
  tempsEntree = DUREE_ENTREE;
  minuterieEclaireurs = CFG.intervalleEclaireurs;
  enExplosion = false;
  explosions = [];
  ajouterEnnemi(b);
  return b;
}

// ----- Mise à jour ------------------------------------------
export function majBoss(dt) {
  if (!bossActuel) return;
  const b = bossActuel;

  if (tempsEntree > 0) tempsEntree = Math.max(0, tempsEntree - dt);

  if (b.vivant && ETAT.statut === 'enCours') {
    // Régénération du bouclier après un délai sans dégât
    b.tempsSansDegat += dt;
    if (b.tempsSansDegat >= CFG.delaiRegen && b.bouclier < b.bouclierMax) {
      b.bouclier = Math.min(b.bouclierMax, b.bouclier + CFG.regenBouclier * dt);
    }
    // Ponte d'éclaireurs pendant la progression
    minuterieEclaireurs -= dt;
    if (minuterieEclaireurs <= 0) {
      for (let i = 0; i < CFG.eclaireursParPonte; i++) {
        const e = creerEnnemi('eclaireur');
        e.x = b.x; e.y = b.y; e.cible = b.cible;   // sortent du boss
      }
      minuterieEclaireurs = CFG.intervalleEclaireurs;
    }
  } else if (!b.vivant && b.tue && !enExplosion) {
    // Détruit par les tourelles → lance l'explosion en plusieurs phases
    demarrerExplosion();
  }

  if (enExplosion) {
    tempsExplosion += dt;
    for (const ex of explosions) {
      if (tempsExplosion >= ex.retard) ex.t += dt;
    }
    if (tempsExplosion > 2.0) reinitBossFinExplosion();
  }
}

function demarrerExplosion() {
  enExplosion = true;
  tempsExplosion = 0;
  const couleurs = [PALETTE.cyan, PALETTE.magenta, PALETTE.or, PALETTE.cyan, PALETTE.magenta, PALETTE.or];
  explosions = couleurs.map((c, i) => ({
    retard: i * 0.22, t: 0, duree: 0.75,
    rayonMax: CFG.taille * (2 + i * 0.7), couleur: c,
  }));
}

function reinitBossFinExplosion() {
  bossActuel = null;
  enExplosion = false;
  explosions = [];
}

// ----- Caméra (entrée : zoom + tremblement) -----------------
// Appliquée aux couches « monde » uniquement (pas au HUD).
export function appliquerCamera(ctx) {
  if (!bossActuel || tempsEntree <= 0) return;
  const env = tempsEntree / DUREE_ENTREE;          // 1 → 0
  const zoom = 1 + 0.18 * Math.sin((1 - env) * Math.PI); // dézoom en cloche
  const amp = 7 * env;
  const sx = (Math.random() * 2 - 1) * amp;
  const sy = (Math.random() * 2 - 1) * amp;
  const cx = Math.max(180, Math.min(LARGEUR - 180, bossActuel.x));
  const cy = Math.max(120, Math.min(HAUTEUR - 120, bossActuel.y));
  ctx.translate(cx + sx, cy + sy);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);
}

// ----- Rendu du vaisseau ------------------------------------
export function dessinerBoss(ctx) {
  if (!bossActuel) return;
  const b = bossActuel;

  if (enExplosion) { dessinerExplosion(ctx, b.x, b.y); return; }
  if (!b.vivant) return;

  const T = CFG.taille;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);

  // Coque : grand triangle allongé à pointe avant
  ctx.shadowColor = PALETTE.violet;
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(20, 8, 38, 0.95)';
  ctx.strokeStyle = PALETTE.violet;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(T * 2.0, 0);
  ctx.lineTo(-T * 0.9, T * 0.85);
  ctx.lineTo(-T * 1.2, 0);
  ctx.lineTo(-T * 0.9, -T * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Superstructure dorsale (dorée)
  ctx.shadowColor = PALETTE.or;
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
  ctx.strokeStyle = PALETTE.or;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(T * 1.0, 0);
  ctx.lineTo(-T * 0.3, T * 0.34);
  ctx.lineTo(-T * 0.55, 0);
  ctx.lineTo(-T * 0.3, -T * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Passerelle (point cyan vers l'avant)
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = 10;
  ctx.fillStyle = PALETTE.cyan;
  ctx.beginPath();
  ctx.arc(T * 0.7, 0, T * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // Tuyères arrière
  ctx.fillStyle = PALETTE.magenta;
  ctx.shadowColor = PALETTE.magenta;
  ctx.fillRect(-T * 1.15, -T * 0.55, T * 0.25, T * 0.28);
  ctx.fillRect(-T * 1.15, T * 0.27, T * 0.25, T * 0.28);

  // Bouclier régénérant (bulle cyan proportionnelle)
  if (b.bouclier > 0) {
    const a = 0.15 + 0.4 * (b.bouclier / b.bouclierMax);
    ctx.shadowColor = PALETTE.cyan;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = PALETTE.cyan;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.ellipse(T * 0.2, 0, T * 2.5, T * 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = a * 0.25;
    ctx.fillStyle = PALETTE.cyan;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function dessinerExplosion(ctx, x, y) {
  ctx.save();
  for (const ex of explosions) {
    if (ex.t <= 0 || ex.t > ex.duree) continue;
    const f = ex.t / ex.duree;
    ctx.globalAlpha = 1 - f;
    ctx.strokeStyle = ex.couleur;
    ctx.lineWidth = 4;
    ctx.shadowColor = ex.couleur;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(x, y, ex.rayonMax * f, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ----- Barre de vie dédiée (HUD, pas de tremblement) --------
export function dessinerBarreBoss(ctx) {
  if (!bossActuel || !bossActuel.vivant) return;
  const b = bossActuel;
  const W = 560, H = 16, x = (LARGEUR - W) / 2, y = 34;

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Fond
  ctx.fillStyle = 'rgba(5, 1, 15, 0.82)';
  ctx.fillRect(x - 4, y - 10, W + 8, H + 30);
  // Coque
  ctx.fillStyle = 'rgba(255, 0, 120, 0.22)';
  ctx.fillRect(x, y, W, H);
  ctx.fillStyle = PALETTE.magenta;
  ctx.fillRect(x, y, W * (b.pv / b.pvMax), H);
  // Bouclier (fine barre cyan au-dessus)
  ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.fillRect(x, y - 6, W, 4);
  ctx.fillStyle = PALETTE.cyan;
  ctx.fillRect(x, y - 6, W * (b.bouclier / b.bouclierMax), 4);
  // Contour + titre
  ctx.strokeStyle = PALETTE.or;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, W, H);
  ctx.fillStyle = PALETTE.or;
  ctx.font = 'bold 14px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = PALETTE.or;
  ctx.shadowBlur = 8;
  ctx.fillText(CFG.nom, LARGEUR / 2, y + H + 14);
  ctx.textAlign = 'left';
  ctx.restore();
}
