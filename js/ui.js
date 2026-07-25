// ============================================================
//  ui.js — HUD (₿ / vies / vague) + écrans victoire/défaite
//  (version minimale étape 5 ; enrichie à l'étape 7)
// ============================================================
import { PALETTE, LARGEUR, HAUTEUR, ECONOMIE, VAGUES } from '../config.js';
import { ETAT } from './etat.js';
import { tempsAvantVague, reinitialiserPartie, lancerVagueImmediat } from './vagues.js';

// ----- HUD néon : pods d'état + bouton de vague ----------------
export function dessinerHUD(ctx) {
  const W = 116, H = 42, G = 8, y = 10;
  const xVague = LARGEUR - 10 - W;
  const xVies = xVague - G - W;
  const xBtc = xVies - G - W;

  pod(ctx, xBtc, y, W, H, PALETTE.or, '₿', String(ETAT.btc), null);
  pod(ctx, xVies, y, W, H, PALETTE.magenta, '❤', String(ETAT.vies), ETAT.vies / ECONOMIE.viesDepart);
  pod(ctx, xVague, y, W, H, PALETTE.cyan, '≋', ETAT.vague + '/' + VAGUES.length, ETAT.vague / VAGUES.length);

  const t = tempsAvantVague();
  if (t !== null && ETAT.statut === 'enCours') dessinerBoutonVague(ctx, t);
}

function pod(ctx, x, y, w, h, couleur, icone, val, frac) {
  ctx.save();
  // Cadre néon
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 9);
  ctx.fillStyle = 'rgba(5, 1, 15, 0.74)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = couleur;
  ctx.shadowColor = couleur;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textBaseline = 'middle';
  const cy = frac == null ? y + h / 2 : y + h / 2 - 4;
  ctx.fillStyle = couleur;
  ctx.shadowColor = couleur;
  ctx.shadowBlur = 6;
  ctx.font = 'bold 16px Segoe UI, sans-serif';
  ctx.fillText(icone, x + 12, cy);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eafcff';
  ctx.font = 'bold 15px Segoe UI, sans-serif';
  ctx.fillText(val, x + 34, cy);

  if (frac != null) {
    const bx = x + 12, bw = w - 24, by = y + h - 10;
    ctx.fillStyle = 'rgba(234, 252, 255, 0.15)';
    ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = couleur;
    ctx.shadowColor = couleur;
    ctx.shadowBlur = 6;
    ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, frac)), 3);
  }
  ctx.restore();
}

// ----- Bouton « Lancer la vague » ------------------------------
function boutonVagueRect() {
  return { x: LARGEUR / 2 - 145, y: HAUTEUR - 54, w: 290, h: 40 };
}
export function clicLancerVague(x, y) {
  if (ETAT.statut !== 'enCours' || tempsAvantVague() === null) return false;
  const b = boutonVagueRect();
  if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
    lancerVagueImmediat();
    return true;
  }
  return false;
}
function dessinerBoutonVague(ctx, t) {
  const b = boutonVagueRect();
  const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 300);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 10);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.cyan;
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = 8 + 12 * pulse;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.cyan;
  ctx.font = 'bold 15px Segoe UI, sans-serif';
  ctx.fillText(
    `▶ LANCER LA VAGUE ${ETAT.vague + 1}   ·   ESPACE   (auto ${Math.ceil(t)}s)`,
    b.x + b.w / 2, b.y + b.h / 2 + 1
  );
  ctx.textAlign = 'left';
  ctx.restore();
}

// ----- Écran de fin -----------------------------------------
const BOUTON = { w: 190, h: 48 };
function boutonRejouerRect() {
  return { x: LARGEUR / 2 - BOUTON.w / 2, y: HAUTEUR / 2 + 40, w: BOUTON.w, h: BOUTON.h };
}

// Clic sur « Rejouer ». Renvoie true si géré.
export function clicRejouer(x, y) {
  if (ETAT.statut === 'enCours') return false;
  const b = boutonRejouerRect();
  if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
    reinitialiserPartie();
    return true;
  }
  return false;
}

export function dessinerFin(ctx) {
  if (ETAT.statut === 'enCours') return;
  // Laisse les effets (explosion planète / effondrement vortex) se jouer,
  // puis fait apparaître l'écran de fin en fondu.
  const e = ETAT.tempsFin != null ? (performance.now() - ETAT.tempsFin) / 1000 : 99;
  const app = Math.max(0, Math.min(1, (e - 1.3) / 0.8));
  if (app <= 0) return;

  const gagne = ETAT.statut === 'victoire';
  const c = gagne ? PALETTE.or : PALETTE.magenta;

  ctx.save();
  ctx.globalAlpha = app;
  ctx.fillStyle = 'rgba(5, 1, 15, 0.78)';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  ctx.textAlign = 'center';

  ctx.fillStyle = c;
  ctx.shadowColor = c;
  ctx.shadowBlur = 22;
  ctx.font = 'bold 46px Segoe UI, sans-serif';
  ctx.fillText(gagne ? 'VICTOIRE' : 'DÉFAITE', LARGEUR / 2, HAUTEUR / 2 - 40);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#eafcff';
  ctx.font = '16px Segoe UI, sans-serif';
  ctx.fillText(`Meilleure vague atteinte : ${ETAT.meilleureVague} / 10`, LARGEUR / 2, HAUTEUR / 2 + 4);

  // Bouton Rejouer
  const b = boutonRejouerRect();
  ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = PALETTE.cyan;
  ctx.lineWidth = 2;
  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = 12;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.cyan;
  ctx.font = 'bold 18px Segoe UI, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶ REJOUER', LARGEUR / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}
