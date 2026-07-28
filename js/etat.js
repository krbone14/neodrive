// ============================================================
//  etat.js — état de la partie : ₿, vies, vague, statut
//  (module partagé, sans dépendance de jeu → pas d'import circulaire)
// ============================================================
import { ECONOMIE } from '../config.js';
import { sfxExplosion, sfxDefaite, sfxVictoire } from './musique.js';

const CLE_MEILLEURE = 'neodrive.meilleureVague';

export const ETAT = {
  btc: 0,
  vies: 0,
  vague: 0,               // vague en cours (0 = pas encore lancée)
  statut: 'enCours',      // 'enCours' | 'victoire' | 'defaite'
  meilleureVague: 0,
  tempsFin: null,         // horodatage (ms) de fin de partie, pour les animations
  pause: false,           // jeu en pause
};

export function initEtat() {
  ETAT.btc = ECONOMIE.btcDepart;
  ETAT.vies = ECONOMIE.viesDepart;
  ETAT.vague = 0;
  ETAT.statut = 'enCours';
  ETAT.tempsFin = null;
  ETAT.pause = false;
  ETAT.meilleureVague = chargerMeilleure();
}

// Bascule la pause (uniquement pendant la partie)
export function basculerPause() {
  if (ETAT.statut !== 'enCours') return false;
  ETAT.pause = !ETAT.pause;
  return ETAT.pause;
}

// ----- Argent ₿ ---------------------------------------------
export function peutPayer(cout) {
  return ETAT.btc >= cout;
}
export function depenser(cout) {
  if (ETAT.btc < cout) return false;
  ETAT.btc -= cout;
  return true;
}
export function gagnerBtc(n) {
  ETAT.btc += n;
}

// ----- Intégrité de la base ---------------------------------
export function perdreVie(n) {
  ETAT.vies -= n;
  if (ETAT.vies <= 0) {
    ETAT.vies = 0;
    ETAT.statut = 'defaite';
    ETAT.tempsFin = performance.now();
    sfxExplosion();   // la planète explose
    sfxDefaite();
    enregistrerMeilleure();
  }
}

// ----- Progression ------------------------------------------
export function marquerVague(v) {
  ETAT.vague = v;
  if (v > ETAT.meilleureVague) {
    ETAT.meilleureVague = v;
    enregistrerMeilleure();
  }
}
export function victoire() {
  ETAT.statut = 'victoire';
  ETAT.tempsFin = performance.now();
  sfxVictoire();
  enregistrerMeilleure();
}

// ----- Meilleure vague (localStorage) -----------------------
function chargerMeilleure() {
  const v = parseInt(localStorage.getItem(CLE_MEILLEURE) || '0', 10);
  return Number.isNaN(v) ? 0 : v;
}
function enregistrerMeilleure() {
  try { localStorage.setItem(CLE_MEILLEURE, String(ETAT.meilleureVague)); } catch (e) { /* ignore */ }
}
