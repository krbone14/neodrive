// ============================================================
//  ennemis.js — types d'ennemis, déplacement sur trajectoire, PV
// ============================================================
import { ENNEMIS as CFG } from '../config.js';
import { CHEMIN, CENTRE_TROU } from './carte.js';
import { gagnerBtc, perdreVie } from './etat.js';
import { sfxSpawn, sfxMort, sfxFissure } from './musique.js';

// Liste des ennemis actifs (module = source unique)
let ennemis = [];

export function reinitEnnemis() {
  ennemis = [];
}

export function listeEnnemis() {
  return ennemis;
}

// Crée un ennemi du type donné à l'entrée du chemin.
export function creerEnnemi(type) {
  const def = CFG[type];
  const e = {
    type,
    def,
    chemin: CHEMIN,
    cible: 1,                 // index du prochain point de passage visé
    x: CENTRE_TROU.x,         // apparaît au centre du vortex
    y: CENTRE_TROU.y,
    pv: def.pv,
    pvMax: def.pv,
    vitesse: def.vitesse,
    ralenti: 1,               // facteur de vitesse (champ gravitationnel), 1 = normal
    angle: 0,
    vivant: true,
    arrive: false,            // a atteint la planète (perte de vie → étape 5)
    tue: false,               // détruit par une tourelle (gain ₿ → étape 5)
  };
  ennemis.push(e);
  sfxSpawn();                     // son de sortie du vortex
  return e;
}

// ----- Mise à jour ------------------------------------------
export function majEnnemis(dt) {
  for (const e of ennemis) {
    if (e.vivant) deplacer(e, dt);
    if (e.arrive) { perdreVie(e.def.degatsBase || 1); sfxFissure(); }   // fissure la planète
    e.ralenti = 1;                // réinitialisé chaque frame (réappliqué par les tours)
  }
  // Retire les ennemis morts ou arrivés
  ennemis = ennemis.filter(e => e.vivant);
}

// Ajoute un ennemi déjà construit (utilisé par le boss)
export function ajouterEnnemi(e) {
  ennemis.push(e);
}

// Inflige des dégâts à un ennemi (appelé par les tourelles)
export function infligerDegats(e, degats) {
  if (!e.vivant) return;
  // Bouclier (boss) : à briser avant d'entamer la coque
  if (e.bouclier > 0) {
    e.tempsSansDegat = 0;
    e.bouclier -= degats;
    if (e.bouclier < 0) { e.pv += e.bouclier; e.bouclier = 0; } // surplus → coque
    else return;                                                // absorbé
  } else {
    e.pv -= degats;
  }
  if (e.pv <= 0) {
    e.pv = 0;
    e.vivant = false;
    e.tue = true;
    gagnerBtc(e.def.gain);   // récompense ₿
    if (!e.estBoss) sfxMort();   // le boss a sa propre explosion
  }
}

function deplacer(e, dt) {
  let reste = e.vitesse * e.ralenti * dt;   // distance à parcourir cette frame
  while (reste > 0 && e.cible < e.chemin.length) {
    const c = e.chemin[e.cible];
    const dx = c.x - e.x;
    const dy = c.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= reste) {
      e.x = c.x; e.y = c.y;
      e.cible++;
      reste -= dist;
    } else {
      const k = reste / dist;
      e.x += dx * k;
      e.y += dy * k;
      e.angle = Math.atan2(dy, dx);
      reste = 0;
    }
  }
  if (e.cible >= e.chemin.length) {
    e.arrive = true;
    e.vivant = false;
  } else {
    const c = e.chemin[e.cible];
    e.angle = Math.atan2(c.y - e.y, c.x - e.x);
  }
}

// ----- Rendu (vectoriel + glow néon) ------------------------
export function dessinerEnnemis(ctx) {
  for (const e of ennemis) {
    if (e.estBoss) continue;   // le boss a son propre rendu (boss.js)
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.shadowColor = e.def.couleur;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = e.def.couleur;
    ctx.fillStyle = e.def.remplissage;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    FORMES[e.type](ctx, e.def.taille);
    ctx.restore();
  }
}

// Formes orientées vers +x (sens du déplacement)
const FORMES = {
  // Éclaireur : petit dard triangulaire effilé
  eclaireur(ctx, t) {
    ctx.beginPath();
    ctx.moveTo(t * 1.4, 0);
    ctx.lineTo(-t * 0.8, t * 0.6);
    ctx.lineTo(-t * 0.35, 0);
    ctx.lineTo(-t * 0.8, -t * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  // Croiseur : losange allongé blindé
  croiseur(ctx, t) {
    ctx.beginPath();
    ctx.moveTo(t * 1.5, 0);
    ctx.lineTo(0, t * 0.55);
    ctx.lineTo(-t * 1.5, 0);
    ctx.lineTo(0, -t * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // arête centrale (blindage)
    ctx.beginPath();
    ctx.moveTo(t * 1.1, 0);
    ctx.lineTo(-t * 1.1, 0);
    ctx.stroke();
  },
  // Intercepteur : hexagone (profil équilibré)
  intercepteur(ctx, t) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * t;
      const y = Math.sin(a) * t;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
};

// ----- Spawner de démonstration (TEMPORAIRE, remplacé étape 5) ----
let minuterie = 0;
let indexType = 0;
const CYCLE = ['eclaireur', 'eclaireur', 'croiseur', 'intercepteur'];

export function spawnDemo(dt) {
  minuterie -= dt;
  if (minuterie <= 0) {
    creerEnnemi(CYCLE[indexType % CYCLE.length]);
    indexType++;
    minuterie = 1.2;
  }
}
