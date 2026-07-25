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
import { clicRejouer, clicLancerVague } from './ui.js';

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

function brancherSaisie(canvas) {
  canvas.addEventListener('mousemove', e => {
    const p = positionSouris(canvas, e);
    definirSurvol(p.x, p.y);
  });
  canvas.addEventListener('mouseleave', () => definirSurvol(null, null));
  canvas.addEventListener('click', e => {
    const p = positionSouris(canvas, e);
    if (clicRejouer(p.x, p.y)) return;                                        // écran de fin
    if (clicLancerVague(p.x, p.y)) return;                                    // bouton de vague
    if (clicSelecteur(p.x, p.y)) { definirSurvol(null, null); return; }       // sélecteur de type
    if (clicPanneauAmelioration(p.x, p.y)) return;                            // bouton Améliorer
    const t = tourAuPoint(p.x, p.y);
    if (t) { selectionnerTour(t); definirSurvol(null, null); return; }        // sélectionne une tour
    deselectionnerTour();                                                     // pose ailleurs
    definirSurvol(p.x, p.y);
    poserSurvol();
  });

  // Clavier : 1/2/3 = type · A = améliorer · Espace = lancer la vague · R = rejouer
  window.addEventListener('keydown', e => {
    if (e.key === '1') selectionner('laser');
    else if (e.key === '2') selectionner('gravite');
    else if (e.key === '3') selectionner('plasma');
    else if (e.key === 'a' || e.key === 'A') ameliorerSelectionnee();
    else if (e.key === 'v' || e.key === 'V') vendreSelectionnee();
    else if (e.key === ' ') { e.preventDefault(); lancerVagueImmediat(); }
    else if (e.key === 'r' || e.key === 'R') reinitialiserPartie();
  });
}

window.addEventListener('DOMContentLoaded', init);
