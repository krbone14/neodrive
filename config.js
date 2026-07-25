// ============================================================
//  NÉODRIVE — config.js
//  TOUTES les valeurs d'équilibrage sont ici.
//  Objectif : régler le jeu sans toucher au reste du code.
// ============================================================

// ----- PALETTE (jamais de couleur en dur ailleurs) ----------
export const PALETTE = {
  fond:      '#05010f', // fond spatial profond
  cyan:      '#00f0ff',
  magenta:   '#ff00c8',
  violet:    '#a020f0',
  or:        '#ffd700',
  blanc:     '#eafcff', // étoiles / texte
  grilleFaible: 'rgba(160, 32, 240, 0.10)', // lignes de grille discrètes
};

// ----- DIMENSIONS / GRILLE ----------------------------------
export const GRILLE = {
  cols: 24,
  rangs: 15,
  tailleCase: 40,        // px par case
};
// Dimensions du canvas déduites de la grille
export const LARGEUR = GRILLE.cols * GRILLE.tailleCase;  // 960
export const HAUTEUR = GRILLE.rangs * GRILLE.tailleCase; // 600

// ----- TRAJECTOIRE DES ENNEMIS ------------------------------
// Points de passage en coordonnées de CASE (col, rang).
// Les ennemis entrent à gauche et sortent à droite.
export const TRAJECTOIRE = [
  { col: -1, rang: 3 },
  { col: 6,  rang: 3 },
  { col: 6,  rang: 11 },
  { col: 12, rang: 11 },
  { col: 12, rang: 3 },
  { col: 18, rang: 3 },
  { col: 18, rang: 11 },
  { col: 24, rang: 11 },
];

// ----- DÉCORS D'EXTRÉMITÉS -----------------------------------
// Trou noir = point d'apparition (entrée) · Planète = point d'arrivée (sortie).
// decalageX = décalage px depuis le point d'entrée / de sortie du chemin,
// pour que le décor chevauche joliment le bord de l'écran.
export const DECORS = {
  // aplatissement : écrase la hauteur → disque vu presque de profil.
  // 0.38 => épaisseur totale ≈ 1 case. bras : nombre de bras spiraux.
  trouNoir: { rayon: 32, vitesseRotation: 0.9, decalageX: 42, aplatissement: 0.32, bras: 2 },
  // vitesseRotation : défilement lent des continents (rotation de la Terre).
  planete:  { rayon: 42, vitesseRotation: 0.025, decalageX: -26 },
};

// ----- FOND ÉTOILÉ (parallaxe) ------------------------------
export const ETOILES = {
  couches: [
    { nombre: 60, vitesse: 6,  taille: 1.0, opacite: 0.35 }, // lointaines
    { nombre: 35, vitesse: 14, taille: 1.6, opacite: 0.55 }, // moyennes
    { nombre: 18, vitesse: 26, taille: 2.4, opacite: 0.85 }, // proches
  ],
};

// ============================================================
//  SECTIONS À REMPLIR AUX ÉTAPES SUIVANTES
//  (laissées vides volontairement — pas de sur-anticipation)
// ============================================================

// ----- TOURELLES (étape 3-4) --------------------------------
// Niveau 1 (les améliorations niv.2 / niv.3 arrivent à l'étape 4).
// cout : ₿ (appliqué à l'étape 5) · portee : px · cadence : tirs/seconde
// degats : par tir · ralentissement : facteur de vitesse appliqué (0.5 = -50%)
// rayonZone : rayon des dégâts de zone (plasma) · vitesseProjectile : px/s
// Chaque tourelle a 3 niveaux. niveaux[0] = pose, [1] et [2] = améliorations.
// cout : ₿ (pose ou amélioration) · chaque niveau : + portée, + dégâts, + cadence.
export const TOURELLES = {
  laser: {
    nom: 'Laser',
    couleur: PALETTE.cyan,
    niveaux: [
      { cout: 50, portee: 135, degats: 10, cadence: 3.5 },  // niv.1 (DPS 35)
      { cout: 40, portee: 160, degats: 16, cadence: 4.2 },  // niv.2 (DPS 67)
      { cout: 70, portee: 185, degats: 26, cadence: 5 },    // niv.3 (DPS 130, dorée)
    ],
  },
  gravite: {
    nom: 'Champ gravitationnel',
    couleur: PALETTE.violet,
    niveaux: [
      { cout: 70, portee: 95,  ralentissement: 0.50 },     // niv.1  (-50%)
      { cout: 55, portee: 115, ralentissement: 0.38 },     // niv.2  (-62%)
      { cout: 90, portee: 135, ralentissement: 0.25 },     // niv.3  (-75%, dorée)
    ],
  },
  plasma: {
    nom: 'Canon à plasma',
    couleur: PALETTE.magenta,
    niveaux: [
      { cout: 90,  portee: 125, degats: 20, cadence: 1.0, rayonZone: 48, vitesseProjectile: 280 },
      { cout: 70,  portee: 145, degats: 32, cadence: 1.2, rayonZone: 60, vitesseProjectile: 300 },
      { cout: 110, portee: 165, degats: 48, cadence: 1.4, rayonZone: 74, vitesseProjectile: 320 },
    ],
  },
};

// Couleur du glow selon le niveau d'amélioration (étape 4)
// niv.1 cyan → niv.2 magenta → niv.3 dorée
export const COULEUR_NIVEAU = [PALETTE.cyan, PALETTE.magenta, PALETTE.or];

// ----- RÈGLES DE PLACEMENT ----------------------------------
export const PLACEMENT = {
  rayonInterditDecor: 80,   // px autour du trou noir / de la planète : pose interdite
  margeColonnes: 2,         // colonnes interdites de chaque côté (gauche + droite)
  margeLignes: 1,           // lignes interdites en haut et en bas
};

// ----- ENNEMIS (étape 2) ------------------------------------
// pv : points de vie · vitesse : px/seconde · taille : rayon de base px
// gain : ₿ gagnés à la destruction (utilisé à l'étape 5) · remplissage : intérieur translucide
export const ENNEMIS = {
  eclaireur: {
    nom: 'Éclaireur',
    pv: 45, vitesse: 115, taille: 12, gain: 5, degatsBase: 1,
    couleur: PALETTE.cyan,
    remplissage: 'rgba(0, 240, 255, 0.15)',
  },
  croiseur: {
    nom: 'Croiseur',
    pv: 340, vitesse: 52, taille: 16, gain: 15, degatsBase: 3,
    couleur: PALETTE.magenta,
    remplissage: 'rgba(255, 0, 200, 0.15)',
  },
  intercepteur: {
    nom: 'Intercepteur',
    // profil équilibré entre l'Éclaireur et le Croiseur
    pv: 150, vitesse: 82, taille: 14, gain: 10, degatsBase: 2,
    couleur: PALETTE.violet,
    remplissage: 'rgba(160, 32, 240, 0.20)',
  },
};

// ----- ÉCONOMIE ₿ + RYTHME DES VAGUES (étape 5) -------------
export const ECONOMIE = {
  btcDepart: 100,          // ₿ de départ
  viesDepart: 10,          // intégrité de la base
  delaiInitial: 5,         // s avant la 1re vague
  delaiEntreVagues: 6,     // s entre deux vagues
  ecartGroupe: 1.2,        // s de pause entre deux groupes d'une même vague
};

// ----- VAGUES : 10 vagues, difficulté croissante ------------
// Chaque vague = liste de groupes { type, nombre, intervalle (s entre apparitions) }.
export const VAGUES = [
  // 1
  [{ type: 'eclaireur', nombre: 8, intervalle: 0.7 }],
  // 2
  [{ type: 'eclaireur', nombre: 12, intervalle: 0.55 }],
  // 3
  [{ type: 'eclaireur', nombre: 8, intervalle: 0.5 },
   { type: 'intercepteur', nombre: 5, intervalle: 0.85 }],
  // 4
  [{ type: 'intercepteur', nombre: 9, intervalle: 0.65 },
   { type: 'eclaireur', nombre: 12, intervalle: 0.38 }],
  // 5
  [{ type: 'croiseur', nombre: 5, intervalle: 1.1 },
   { type: 'eclaireur', nombre: 14, intervalle: 0.38 }],
  // 6
  [{ type: 'intercepteur', nombre: 14, intervalle: 0.5 },
   { type: 'croiseur', nombre: 5, intervalle: 1.0 }],
  // 7
  [{ type: 'eclaireur', nombre: 24, intervalle: 0.28 },
   { type: 'croiseur', nombre: 7, intervalle: 0.85 }],
  // 8
  [{ type: 'croiseur', nombre: 10, intervalle: 0.85 },
   { type: 'intercepteur', nombre: 14, intervalle: 0.45 }],
  // 9
  [{ type: 'eclaireur', nombre: 28, intervalle: 0.25 },
   { type: 'intercepteur', nombre: 16, intervalle: 0.45 },
   { type: 'croiseur', nombre: 8, intervalle: 0.75 }],
  // 10 — LE DREADNOUGHT + escorte
  [{ type: 'dreadnought', nombre: 1, intervalle: 1 },
   { type: 'croiseur', nombre: 8, intervalle: 1.8 },
   { type: 'intercepteur', nombre: 12, intervalle: 0.9 }],
];

// ----- BOSS : LE DREADNOUGHT (étape 6) ----------------------
// PV de coque ≥ 25× un croiseur (170) = 4250.
export const BOSS = {
  nom: 'LE DREADNOUGHT',
  coque: 11000,              // PV de coque (à entamer après le bouclier ; ≥ 25× croiseur)
  bouclier: 3000,            // bouclier régénérant
  regenBouclier: 180,        // PV de bouclier / seconde
  delaiRegen: 4,             // s sans subir de dégât avant régénération
  vitesse: 24,               // très lent
  gain: 0,                   // ₿ à la destruction
  taille: 40,                // échelle de rendu (vaisseau immense)
  intervalleEclaireurs: 3,   // s entre deux pontes d'éclaireurs
  eclaireursParPonte: 4,
};
