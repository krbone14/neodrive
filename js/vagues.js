// ============================================================
//  vagues.js — séquencement des 10 vagues, apparition des ennemis
// ============================================================
import { VAGUES, ECONOMIE } from '../config.js';
import { creerEnnemi, listeEnnemis, reinitEnnemis } from './ennemis.js';
import { reinitTours } from './tours.js';
import { creerBoss, reinitBoss } from './boss.js';
import { ETAT, initEtat, marquerVague, victoire } from './etat.js';

let file = [];             // file d'apparitions de la vague courante : { type, delai }
let pointeur = 0;
let minuterie = 0;         // temps restant avant la prochaine apparition
let entreVagues = true;    // en pause avant / entre les vagues
let compteur = 0;          // compte à rebours de la pause

export function initVagues() {
  file = [];
  pointeur = 0;
  minuterie = 0;
  entreVagues = true;
  compteur = ECONOMIE.delaiInitial;
}

// Réinitialise toute la partie (ennemis, tours, économie, vagues)
export function reinitialiserPartie() {
  reinitEnnemis();
  reinitTours();
  reinitBoss();
  initEtat();
  initVagues();
}

// Une vague est-elle en attente de lancement ?
export function enAttenteVague() {
  return entreVagues;
}
// La toute première vague (lancement manuel obligatoire) ?
export function estPremiereVague() {
  return entreVagues && ETAT.vague === 0;
}
// Compte à rebours avant la prochaine vague (null : 1re vague ou vague en cours)
export function tempsAvantVague() {
  return (entreVagues && ETAT.vague > 0) ? Math.max(0, compteur) : null;
}

// Lance la vague en attente (bouton / touche Espace)
export function lancerVagueImmediat() {
  if (!entreVagues || ETAT.statut !== 'enCours') return;
  if (ETAT.vague === 0) lancerVague();   // 1re vague : lancement direct
  else compteur = 0;                     // suivantes : termine le compte à rebours
}

// ----- Mise à jour ------------------------------------------
export function majVagues(dt) {
  if (ETAT.statut !== 'enCours') return;

  if (entreVagues) {
    if (ETAT.vague > 0) {                 // vagues 2+ : compte à rebours automatique
      compteur -= dt;
      if (compteur <= 0) lancerVague();
    }
    return;                               // 1re vague : on attend le joueur
  }

  // Apparitions échelonnées
  if (pointeur < file.length) {
    minuterie -= dt;
    if (minuterie <= 0) {
      const type = file[pointeur].type;
      if (type === 'dreadnought') creerBoss(); else creerEnnemi(type);
      pointeur++;
      minuterie = pointeur < file.length ? file[pointeur].delai : 0;
    }
  }

  // Fin de vague : tout est apparu et plus aucun ennemi vivant
  if (pointeur >= file.length && listeEnnemis().length === 0) {
    if (ETAT.vague >= VAGUES.length) {
      victoire();
    } else {
      entreVagues = true;
      compteur = ECONOMIE.delaiEntreVagues;
    }
  }
}

function lancerVague() {
  entreVagues = false;
  const v = ETAT.vague + 1;
  marquerVague(v);
  construireFile(VAGUES[v - 1]);
  pointeur = 0;
  minuterie = file.length ? file[0].delai : 0;
}

// Aplatit les groupes en une file d'apparitions avec un délai avant chacune
function construireFile(groupes) {
  file = [];
  let premier = true;
  for (const g of groupes) {
    for (let i = 0; i < g.nombre; i++) {
      const delai = (i === 0)
        ? (premier ? 0 : ECONOMIE.ecartGroupe)  // pause entre deux groupes
        : g.intervalle;                          // cadence dans le groupe
      file.push({ type: g.type, delai });
      premier = false;
    }
  }
}
