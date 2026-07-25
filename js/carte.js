// ============================================================
//  carte.js — grille, trajectoire, placement
// ============================================================
import { GRILLE, TRAJECTOIRE, DECORS, PLACEMENT } from '../config.js';

// Centre pixel d'une case (col, rang)
export function centreCase(col, rang) {
  return {
    x: col * GRILLE.tailleCase + GRILLE.tailleCase / 2,
    y: rang * GRILLE.tailleCase + GRILLE.tailleCase / 2,
  };
}

// Trajectoire convertie en points pixel (centres de case)
export const CHEMIN = TRAJECTOIRE.map(p => centreCase(p.col, p.rang));

// Ensemble des cases occupées par la trajectoire → non constructibles.
// On rasterise chaque segment horizontal/vertical entre deux points.
export const CASES_CHEMIN = construireCasesChemin();

function construireCasesChemin() {
  const occupees = new Set();
  const clef = (c, r) => `${c},${r}`;
  for (let i = 0; i < TRAJECTOIRE.length - 1; i++) {
    const a = TRAJECTOIRE[i];
    const b = TRAJECTOIRE[i + 1];
    const dc = Math.sign(b.col - a.col);
    const dr = Math.sign(b.rang - a.rang);
    let c = a.col, r = a.rang;
    occupees.add(clef(c, r));
    while (c !== b.col || r !== b.rang) {
      c += dc; r += dr;
      occupees.add(clef(c, r));
    }
  }
  return occupees;
}

// Une case est-elle constructible ? (dans la grille et hors trajectoire)
export function caseConstructible(col, rang) {
  if (col < 0 || rang < 0 || col >= GRILLE.cols || rang >= GRILLE.rangs) return false;
  return !CASES_CHEMIN.has(`${col},${rang}`);
}

// Convertit une position pixel en coordonnées de case
export function pixelVersCase(x, y) {
  return {
    col: Math.floor(x / GRILLE.tailleCase),
    rang: Math.floor(y / GRILLE.tailleCase),
  };
}

// ----- Règles de placement des tourelles --------------------
// Centres des décors (mêmes calculs que le rendu)
// CENTRE_TROU = point d'apparition des ennemis (ils sortent du vortex)
export const CENTRE_TROU = { x: CHEMIN[0].x + DECORS.trouNoir.decalageX, y: CHEMIN[0].y };
const CENTRE_PLANETE = {
  x: CHEMIN[CHEMIN.length - 1].x + DECORS.planete.decalageX,
  y: CHEMIN[CHEMIN.length - 1].y,
};

// Distance d'un point au segment [a, b]
function distanceSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx, y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

// Distance la plus courte d'un point au chemin complet
export function distanceAuChemin(x, y) {
  let min = Infinity;
  for (let i = 0; i < CHEMIN.length - 1; i++) {
    min = Math.min(min, distanceSegment(x, y, CHEMIN[i].x, CHEMIN[i].y, CHEMIN[i + 1].x, CHEMIN[i + 1].y));
  }
  return min;
}

// Case dans la marge de bord interdite (2 colonnes de chaque côté, 1 ligne haut/bas) ?
export function caseBordInterdit(col, rang) {
  return col < PLACEMENT.margeColonnes
      || col >= GRILLE.cols - PLACEMENT.margeColonnes
      || rang < PLACEMENT.margeLignes
      || rang >= GRILLE.rangs - PLACEMENT.margeLignes;
}

// Case trop proche du trou noir ou de la planète ?
export function caseProcheDecor(col, rang) {
  const c = centreCase(col, rang);
  const r = PLACEMENT.rayonInterditDecor;
  return Math.hypot(c.x - CENTRE_TROU.x, c.y - CENTRE_TROU.y) < r
      || Math.hypot(c.x - CENTRE_PLANETE.x, c.y - CENTRE_PLANETE.y) < r;
}

// Une tourelle de portée donnée peut-elle être posée ici ?
// (case libre du décor, hors zones interdites, et à portée du chemin)
export function casePlacable(col, rang, portee) {
  if (!caseConstructible(col, rang)) return false;
  if (caseBordInterdit(col, rang)) return false;
  if (caseProcheDecor(col, rang)) return false;
  const c = centreCase(col, rang);
  return distanceAuChemin(c.x, c.y) <= portee;
}

// ----- Tourelles sur bloc 2×2 (4 cases) ---------------------
// (col, rang) = coin haut-gauche du bloc. Centre = intersection des 4 cases.
export function centreBloc(col, rang) {
  const T = GRILLE.tailleCase;
  return { x: (col + 1) * T, y: (rang + 1) * T };
}

// Le bloc 2×2 est-il posable ? (dans la grille, 4 cases hors piste,
// aucune proche d'un décor, et centre à portée du chemin)
export function blocPlacable(col, rang, portee) {
  if (col < 0 || rang < 0 || col + 1 >= GRILLE.cols || rang + 1 >= GRILLE.rangs) return false;
  for (let dc = 0; dc < 2; dc++) {
    for (let dr = 0; dr < 2; dr++) {
      if (!caseConstructible(col + dc, rang + dr)) return false;
      if (caseBordInterdit(col + dc, rang + dr)) return false;
      if (caseProcheDecor(col + dc, rang + dr)) return false;
    }
  }
  const c = centreBloc(col, rang);
  return distanceAuChemin(c.x, c.y) <= portee;
}
