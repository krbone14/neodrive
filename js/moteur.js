// ============================================================
//  moteur.js — boucle de jeu, gestion du temps (requestAnimationFrame)
// ============================================================
import { majEtoiles, dessinerFond, dessinerDecors } from './rendu.js';
import { majEnnemis, dessinerEnnemis } from './ennemis.js';
import { majTours, dessinerTours, dessinerTirs, dessinerSelecteur } from './tours.js';
import { majVagues } from './vagues.js';
import { majBoss, dessinerBoss, dessinerBarreBoss, appliquerCamera } from './boss.js';
import { dessinerHUD, dessinerFin } from './ui.js';
import { ETAT } from './etat.js';

let ctx = null;
let dernierTemps = 0;
let enMarche = false;

export function demarrerMoteur(contexte) {
  ctx = contexte;
  enMarche = true;
  dernierTemps = performance.now();
  requestAnimationFrame(boucle);
}

function boucle(temps) {
  if (!enMarche) return;

  // dt en secondes, plafonné pour éviter les grands sauts (onglet en pause)
  let dt = (temps - dernierTemps) / 1000;
  dernierTemps = temps;
  if (dt > 0.05) dt = 0.05;

  majEtat(dt);

  // Couches « monde » (soumises à la caméra : zoom + tremblement du boss)
  ctx.save();
  appliquerCamera(ctx);
  dessinerFond(ctx);
  dessinerTours(ctx);
  dessinerEnnemis(ctx);
  dessinerBoss(ctx);
  dessinerTirs(ctx);
  dessinerDecors(ctx);
  ctx.restore();

  // Couches HUD (jamais secouées)
  dessinerSelecteur(ctx);
  dessinerHUD(ctx);
  dessinerBarreBoss(ctx);
  dessinerFin(ctx);         // superpose l'écran de fin si victoire/défaite

  requestAnimationFrame(boucle);
}

// Mise à jour de l'état du jeu (gelée quand la partie est finie)
function majEtat(dt) {
  majEtoiles(dt);            // le fond continue de vivre même en pause
  if (ETAT.pause) return;    // gel complet du jeu
  majBoss(dt);       // continue l'animation d'explosion même après la victoire
  if (ETAT.statut !== 'enCours') return;
  majVagues(dt);     // apparition des ennemis selon la vague
  majTours(dt);      // ralentissement + tir (avant le déplacement des ennemis)
  majEnnemis(dt);
}
