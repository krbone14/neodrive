// ============================================================
//  main.js — point d'entrée, initialisation, saisie utilisateur
// ============================================================
import { LARGEUR, HAUTEUR } from '../config.js';
import { initEtoiles } from './rendu.js';
import { demarrerMoteur } from './moteur.js';
import {
  selectionner, definirSurvol, poserSurvol, clicSelecteur,
  tourAuPoint, selectionnerTour, deselectionnerTour,
  ameliorerSelectionnee, vendreSelectionnee, clicPanneauAmelioration,
} from './tours.js';
import { reinitialiserPartie, lancerVagueImmediat } from './vagues.js';
import { clicRejouer, clicLancerVague, clicSon } from './ui.js';
import { demarrerMusique, basculerMuet } from './musique.js';

function init() {
  const canvas = document.getElementById('jeu');
  canvas.width = LARGEUR;
  canvas.height = HAUTEUR;

  const ctx = canvas.getContext('2d');

  reinitialiserPartie();   // initialise économie, vies, vagues
  brancherSaisie(canvas);
  initEtoiles();
  demarrerMoteur(ctx);
}

// Convertit un événement souris en coordonnées canvas (gère l'échelle CSS)
function positionSouris(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

// Traite un appui / clic aux coordonnées canvas données
function gererClic(x, y) {
  if (clicSon(x, y)) return;                                      // bouton muet
  if (clicRejouer(x, y)) return;                                  // écran de fin
  if (clicLancerVague(x, y)) return;                              // bouton de vague
  if (clicSelecteur(x, y)) { definirSurvol(null, null); return; } // sélecteur de type
  if (clicPanneauAmelioration(x, y)) return;                      // Améliorer / Détruire
  const t = tourAuPoint(x, y);
  if (t) { selectionnerTour(t); definirSurvol(null, null); return; } // sélectionne une tour
  deselectionnerTour();
  poserSurvol();                                                  // pose sur la case survolée
}

function brancherSaisie(canvas) {
  // Événements pointeur : fonctionnent à la souris ET au toucher
  canvas.addEventListener('pointermove', e => {
    const p = positionSouris(canvas, e);
    definirSurvol(p.x, p.y);
  });
  canvas.addEventListener('pointerleave', () => definirSurvol(null, null));
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    demarrerMusique();         // démarre l'ambiance au 1er contact (autoplay)
    const p = positionSouris(canvas, e);
    definirSurvol(p.x, p.y);   // vise la case sous le doigt/curseur
    gererClic(p.x, p.y);
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault()); // pas de menu au appui long

  // Clavier : 1/2/3 = type · A = améliorer · Espace = lancer la vague · R = rejouer
  window.addEventListener('keydown', e => {
    demarrerMusique();         // démarre l'ambiance au 1er appui clavier
    if (e.key === 'm' || e.key === 'M') basculerMuet();
    else if (e.key === '1') selectionner('laser');
    else if (e.key === '2') selectionner('gravite');
    else if (e.key === '3') selectionner('plasma');
    else if (e.key === 'a' || e.key === 'A') ameliorerSelectionnee();
    else if (e.key === 'v' || e.key === 'V') vendreSelectionnee();
    else if (e.key === ' ') { e.preventDefault(); lancerVagueImmediat(); }
    else if (e.key === 'r' || e.key === 'R') reinitialiserPartie();
  });
}

window.addEventListener('DOMContentLoaded', init);
