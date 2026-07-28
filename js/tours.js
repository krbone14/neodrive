// ============================================================
//  tours.js — tourelles, ciblage, tir, collisions
//  (améliorations niv.2 / niv.3 : étape 4)
// ============================================================
import { TOURELLES as CFG, PALETTE, GRILLE, HAUTEUR } from '../config.js';
import { caseConstructible, centreBloc, blocPlacable } from './carte.js';
import { listeEnnemis, infligerDegats } from './ennemis.js';
import { peutPayer, depenser, gagnerBtc } from './etat.js';
import { sfxTir, sfxPose, sfxClic, sfxAmelioration, sfxPoubelle } from './musique.js';

let tours = [];
let projectiles = [];      // tirs de plasma en vol
let effets = [];           // rayons laser + explosions (visuels éphémères)

let typeSelection = 'laser';
let survol = null;             // { col, rang, valide } sous la souris
let tourSelectionnee = null;   // tour cliquée (pour l'améliorer)

export function reinitTours() {
  tours = [];
  projectiles = [];
  effets = [];
  tourSelectionnee = null;
}

// ----- Sélection & placement --------------------------------
export function selectionner(type) {
  if (CFG[type]) { typeSelection = type; tourSelectionnee = null; sfxClic(); }
}
export function typeSelectionne() {
  return typeSelection;
}

export function poser(col, rang) {
  const def = CFG[typeSelection];
  const portee = def.niveaux[0].portee;
  if (!blocPlacable(col, rang, portee)) return false;
  if (chevauche(col, rang)) return false;
  if (!depenser(def.niveaux[0].cout)) return false;   // coût de pose ₿
  const c = centreBloc(col, rang);
  tours.push({
    type: typeSelection, def,
    stats: def.niveaux[0],   // stats du niveau courant
    col, rang,               // (col,rang) = coin haut-gauche du bloc 2×2
    x: c.x, y: c.y,
    niveau: 1,
    recharge: 0,       // temps restant avant le prochain tir
    angle: 0,          // orientation du canon (laser / plasma)
    angleVisuel: 0,    // rotation décorative (gravité)
  });
  sfxPose();
  return true;
}

// ----- Amélioration d'une tourelle --------------------------
export function tourAuPoint(x, y) {
  const T = GRILLE.tailleCase;
  for (const t of tours) {
    if (x >= t.col * T && x < (t.col + 2) * T && y >= t.rang * T && y < (t.rang + 2) * T) return t;
  }
  return null;
}
export function selectionnerTour(t) { tourSelectionnee = t; sfxClic(); }
export function deselectionnerTour() { tourSelectionnee = null; }

// Améliore la tour sélectionnée (coût ₿ appliqué à l'étape 5)
export function ameliorerSelectionnee() {
  const t = tourSelectionnee;
  if (!t || t.niveau >= 3) return false;
  if (!depenser(t.def.niveaux[t.niveau].cout)) return false;   // coût d'amélioration ₿
  t.niveau++;
  t.stats = t.def.niveaux[t.niveau - 1];
  sfxAmelioration();
  return true;
}

// Total investi dans une tour (pose + améliorations)
function totalInvesti(t) {
  let s = 0;
  for (let i = 0; i < t.niveau; i++) s += t.def.niveaux[i].cout;
  return s;
}
// Remboursement à la revente = moitié de l'investissement
function valeurRevente(t) {
  return Math.floor(totalInvesti(t) * 0.5);
}

// Détruit la tour sélectionnée et rembourse la moitié de son coût total
export function vendreSelectionnee() {
  const t = tourSelectionnee;
  if (!t) return false;
  gagnerBtc(valeurRevente(t));
  tours = tours.filter(x => x !== t);
  tourSelectionnee = null;
  sfxPoubelle();
  return true;
}

// Deux blocs 2×2 se chevauchent-ils ?
function chevauche(col, rang) {
  return tours.some(t => Math.abs(t.col - col) < 2 && Math.abs(t.rang - rang) < 2);
}

// Pose sur la case actuellement survolée
export function poserSurvol() {
  if (!survol) return false;
  return poser(survol.col, survol.rang);
}

// Mémorise le bloc survolé (centré sur le curseur) pour l'aperçu de pose
export function definirSurvol(x, y) {
  if (x === null || panneauContient(x, y) || panneauSelectionContient(x, y)) { survol = null; return; }
  const T = GRILLE.tailleCase;
  let col = Math.round(x / T) - 1;   // bloc 2×2 centré sur le curseur
  let rang = Math.round(y / T) - 1;
  col = Math.max(0, Math.min(GRILLE.cols - 2, col));
  rang = Math.max(0, Math.min(GRILLE.rangs - 2, rang));
  const niv1 = CFG[typeSelection].niveaux[0];
  const valide = blocPlacable(col, rang, niv1.portee) && !chevauche(col, rang) && peutPayer(niv1.cout);
  survol = { col, rang, valide };
}

// ----- Sélecteur de tourelles (HUD provisoire, étape 7) ------
const CHIPS = [
  { type: 'laser', touche: '1' },
  { type: 'gravite', touche: '2' },
  { type: 'plasma', touche: '3' },
];
const CHIP = { w: 172, h: 46, x: 10, y: 10, gap: 8 };

function chipRect(i) {
  return { x: CHIP.x + i * (CHIP.w + CHIP.gap), y: CHIP.y, w: CHIP.w, h: CHIP.h };
}
function panneauContient(x, y) {
  for (let i = 0; i < CHIPS.length; i++) {
    const r = chipRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}
// Clic sur une pastille du sélecteur → change la sélection. Renvoie true si géré.
export function clicSelecteur(x, y) {
  for (let i = 0; i < CHIPS.length; i++) {
    const r = chipRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      selectionner(CHIPS[i].type);
      return true;
    }
  }
  return false;
}

export function dessinerSelecteur(ctx) {
  ctx.save();
  ctx.textBaseline = 'middle';
  for (let i = 0; i < CHIPS.length; i++) {
    const { type, touche } = CHIPS[i];
    const r = chipRect(i);
    const def = CFG[type];
    const sel = type === typeSelection;

    ctx.fillStyle = 'rgba(5, 1, 15, 0.72)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = def.couleur;
    ctx.lineWidth = sel ? 2.5 : 1;
    ctx.globalAlpha = sel ? 1 : 0.45;
    ctx.shadowColor = sel ? def.couleur : 'transparent';
    ctx.shadowBlur = sel ? 12 : 0;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Touche
    ctx.font = 'bold 16px Segoe UI, sans-serif';
    ctx.fillStyle = def.couleur;
    ctx.fillText(touche, r.x + 12, r.y + r.h / 2);
    // Nom
    ctx.font = '13px Segoe UI, sans-serif';
    ctx.fillStyle = sel ? '#eafcff' : 'rgba(234, 252, 255, 0.7)';
    ctx.fillText(def.nom, r.x + 32, r.y + r.h / 2 - 8);
    // Coût ₿ (pose = niveau 1)
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
    ctx.fillText('₿' + def.niveaux[0].cout, r.x + 32, r.y + r.h / 2 + 9);
  }
  ctx.restore();

  dessinerPanneauSelection(ctx);
}

// ----- Panneau de la tour sélectionnée (info + amélioration) ----
const PANNEAU = { w: 250, h: 112, x: 10, marge: 10 };
function panneauSelRect() {
  return { x: PANNEAU.x, y: HAUTEUR - PANNEAU.h - PANNEAU.marge, w: PANNEAU.w, h: PANNEAU.h };
}
function boutonAmelioRect() {
  const p = panneauSelRect();
  return { x: p.x + 12, y: p.y + p.h - 56, w: p.w - 24, h: 22 };
}
function boutonVendreRect() {
  const p = panneauSelRect();
  return { x: p.x + 12, y: p.y + p.h - 28, w: p.w - 24, h: 22 };
}
function dansRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
function panneauSelectionContient(x, y) {
  if (!tourSelectionnee) return false;
  return dansRect(x, y, panneauSelRect());
}
// Clic dans le panneau : améliore ou détruit. Renvoie true si le clic est consommé.
export function clicPanneauAmelioration(x, y) {
  if (!panneauSelectionContient(x, y)) return false;
  if (tourSelectionnee.niveau < 3 && dansRect(x, y, boutonAmelioRect())) ameliorerSelectionnee();
  else if (dansRect(x, y, boutonVendreRect())) vendreSelectionnee();
  return true;
}

function dessinerPanneauSelection(ctx) {
  if (!tourSelectionnee) return;
  const t = tourSelectionnee;
  const p = panneauSelRect();
  const col = couleur(t);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(5, 1, 15, 0.85)';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.shadowColor = col;
  ctx.shadowBlur = 10;
  ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  ctx.shadowBlur = 0;

  ctx.fillStyle = col;
  ctx.font = 'bold 14px Segoe UI, sans-serif';
  ctx.fillText(t.def.nom, p.x + 12, p.y + 20);
  ctx.fillStyle = '#eafcff';
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.fillText(`Niveau ${t.niveau} / 3`, p.x + 12, p.y + 37);

  const s = t.stats;
  const ligne = t.type === 'gravite'
    ? `Portée ${s.portee}  ·  Ralent. ${Math.round((1 - s.ralentissement) * 100)}%`
    : t.type === 'plasma'
      ? `Portée ${s.portee}  ·  Dég. ${s.degats}  ·  Zone ${s.rayonZone}`
      : `Portée ${s.portee}  ·  Dég. ${s.degats}  ·  Cad. ${s.cadence}/s`;
  ctx.fillStyle = 'rgba(234, 252, 255, 0.7)';
  ctx.fillText(ligne, p.x + 12, p.y + 53);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Bouton Améliorer (ou libellé NIVEAU MAX)
  const b = boutonAmelioRect();
  if (t.niveau < 3) {
    const cout = t.def.niveaux[t.niveau].cout;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = PALETTE.or;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = PALETTE.or;
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.fillText(`▲ Améliorer   ₿${cout}   (A)`, b.x + b.w / 2, b.y + b.h / 2 + 1);
  } else {
    ctx.fillStyle = PALETTE.or;
    ctx.font = 'bold 13px Segoe UI, sans-serif';
    ctx.fillText('★ NIVEAU MAX', b.x + b.w / 2, b.y + b.h / 2 + 1);
  }

  // Bouton Détruire (rembourse la moitié)
  const v = boutonVendreRect();
  ctx.fillStyle = 'rgba(255, 0, 200, 0.12)';
  ctx.fillRect(v.x, v.y, v.w, v.h);
  ctx.strokeStyle = PALETTE.magenta;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(v.x, v.y, v.w, v.h);
  ctx.fillStyle = PALETTE.magenta;
  ctx.font = 'bold 12px Segoe UI, sans-serif';
  ctx.fillText(`✖ Détruire   +₿${valeurRevente(t)}   (V)`, v.x + v.w / 2, v.y + v.h / 2 + 1);

  ctx.textAlign = 'left';
  ctx.restore();
}

// ----- Cases interdites (rouge) : dépend de la portée du type sélectionné ----
let cacheInterdites = { portee: null, cases: [] };

// Une case peut-elle appartenir à AU MOINS un bloc 2×2 posable ?
// (cohérent avec la pose réelle : la tourelle couvre 4 cases)
function celluleCouvrable(col, rang, portee) {
  for (let da = -1; da <= 0; da++) {
    for (let db = -1; db <= 0; db++) {
      if (blocPlacable(col + da, rang + db, portee)) return true;
    }
  }
  return false;
}

function casesInterdites() {
  const portee = CFG[typeSelection].niveaux[0].portee;
  if (cacheInterdites.portee === portee) return cacheInterdites.cases;
  const cases = [];
  for (let col = 0; col < GRILLE.cols; col++) {
    for (let rang = 0; rang < GRILLE.rangs; rang++) {
      // constructible (hors piste/grille) mais qu'aucun bloc valide ne couvre → interdite
      if (caseConstructible(col, rang) && !celluleCouvrable(col, rang, portee)) {
        cases.push({ col, rang });
      }
    }
  }
  cacheInterdites = { portee, cases };
  return cases;
}

function couleur(t) {
  // niv.1-2 : couleur du type · niv.3 : dorée
  return t.niveau >= 3 ? PALETTE.or : t.def.couleur;
}

// ----- Mise à jour ------------------------------------------
export function majTours(dt) {
  for (const t of tours) {
    const enPortee = ennemisEnPortee(t);

    if (t.type === 'gravite') {
      // Aura : ralentit les ennemis dans la zone (le boss y est immunisé)
      for (const e of enPortee) {
        if (!e.immuniseRalenti) e.ralenti = Math.min(e.ralenti, t.stats.ralentissement);
      }
      t.angleVisuel += dt * 1.6;
      continue;
    }

    // Laser & plasma : viser la meilleure cible et tirer
    t.recharge -= dt;
    const cible = meilleureCible(enPortee);
    if (cible) {
      t.angle = Math.atan2(cible.y - t.y, cible.x - t.x);
      if (t.recharge <= 0) {
        tirer(t, cible);
        t.recharge = 1 / t.stats.cadence;
      }
    }
  }

  majProjectiles(dt);
  majEffets(dt);
}

function ennemisEnPortee(t) {
  const r2 = t.stats.portee * t.stats.portee;
  return listeEnnemis().filter(e =>
    e.vivant && (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= r2
  );
}

// Cible prioritaire : la plus avancée sur le chemin, puis la plus proche du point suivant
function meilleureCible(cibles) {
  let best = null, meilleureCle = -Infinity;
  for (const e of cibles) {
    const suiv = e.chemin[e.cible] || e.chemin[e.chemin.length - 1];
    const d = Math.hypot(suiv.x - e.x, suiv.y - e.y);
    const cle = e.cible * 10000 - d;
    if (cle > meilleureCle) { meilleureCle = cle; best = e; }
  }
  return best;
}

function tirer(t, cible) {
  sfxTir();
  if (t.type === 'laser') {
    // Dégâts directs instantanés + rayon visuel
    infligerDegats(cible, t.stats.degats);
    effets.push({
      type: 'laser', x1: t.x, y1: t.y, x2: cible.x, y2: cible.y,
      vie: 0.08, vieMax: 0.08, couleur: couleur(t),
    });
  } else if (t.type === 'plasma') {
    // Projectile vers la position actuelle de la cible
    projectiles.push({
      x: t.x, y: t.y, tx: cible.x, ty: cible.y,
      vitesse: t.stats.vitesseProjectile, stats: t.stats, couleur: couleur(t),
    });
  }
}

function majProjectiles(dt) {
  for (const p of projectiles) {
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const pas = p.vitesse * dt;
    if (d <= pas) {
      p.x = p.tx; p.y = p.ty;
      exploser(p);
      p.fini = true;
    } else {
      p.x += (dx / d) * pas;
      p.y += (dy / d) * pas;
    }
  }
  projectiles = projectiles.filter(p => !p.fini);
}

function exploser(p) {
  const r2 = p.stats.rayonZone * p.stats.rayonZone;
  for (const e of listeEnnemis()) {
    if (e.vivant && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) {
      infligerDegats(e, p.stats.degats);
    }
  }
  effets.push({
    type: 'explosion', x: p.x, y: p.y,
    rayon: p.stats.rayonZone, vie: 0.35, vieMax: 0.35, couleur: p.couleur,
  });
}

function majEffets(dt) {
  for (const ef of effets) ef.vie -= dt;
  effets = effets.filter(ef => ef.vie > 0);
}

// ============================================================
//  RENDU
// ============================================================
export function dessinerTours(ctx) {
  // Cases où la pose est interdite (rouge léger)
  dessinerCasesInterdites(ctx);
  // Zones de ralentissement (sous les tours)
  for (const t of tours) if (t.type === 'gravite') dessinerZoneGravite(ctx, t);
  // Aperçu de portée sous la souris
  dessinerApercuPortee(ctx);
  // Tours
  for (const t of tours) dessinerTour(ctx, t);
  // Tour sélectionnée (portée + cadre)
  dessinerSelectionTour(ctx);
  // Aperçu de pose (fantôme)
  dessinerFantome(ctx);
}

function dessinerSelectionTour(ctx) {
  if (!tourSelectionnee) return;
  const t = tourSelectionnee;
  const col = couleur(t);
  const T = GRILLE.tailleCase;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.55;
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.stats.portee, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeRect(t.col * T + 1, t.rang * T + 1, 2 * T - 2, 2 * T - 2);
  ctx.restore();
}

// Projectiles + explosions + rayons laser (au-dessus des ennemis)
export function dessinerTirs(ctx) {
  ctx.save();
  for (const ef of effets) {
    const a = ef.vie / ef.vieMax;
    if (ef.type === 'laser') {
      ctx.strokeStyle = ef.couleur;
      ctx.lineWidth = 2 + 2 * a;
      ctx.globalAlpha = a;
      ctx.shadowColor = ef.couleur;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(ef.x1, ef.y1);
      ctx.lineTo(ef.x2, ef.y2);
      ctx.stroke();
    } else if (ef.type === 'explosion') {
      const r = ef.rayon * (1 - a); // grandit
      ctx.globalAlpha = a;
      ctx.strokeStyle = ef.couleur;
      ctx.lineWidth = 3;
      ctx.shadowColor = ef.couleur;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // Projectiles de plasma
  for (const p of projectiles) {
    ctx.fillStyle = p.couleur;
    ctx.shadowColor = p.couleur;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function dessinerCasesInterdites(ctx) {
  const T = GRILLE.tailleCase;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 40, 70, 0.11)';
  for (const { col, rang } of casesInterdites()) {
    ctx.fillRect(col * T, rang * T, T, T);
  }
  ctx.restore();
}

function dessinerZoneGravite(ctx, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(160, 32, 240, 0.08)';
  ctx.strokeStyle = 'rgba(160, 32, 240, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.stats.portee, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function dessinerApercuPortee(ctx) {
  if (!survol || !survol.valide) return;
  const portee = CFG[typeSelection].niveaux[0].portee;
  const c = centreBloc(survol.col, survol.rang);
  ctx.save();
  ctx.strokeStyle = 'rgba(234, 252, 255, 0.35)';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, portee, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function dessinerTour(ctx, t) {
  const col = couleur(t);
  const dore = t.niveau >= 3;
  const pulse = dore ? 0.5 + 0.5 * Math.sin(performance.now() / 200) : 0;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.shadowColor = col;
  ctx.shadowBlur = dore ? 16 + 14 * pulse : (t.niveau === 2 ? 18 : 13);
  ctx.strokeStyle = col;
  ctx.lineWidth = dore ? 3 : (t.niveau === 2 ? 2.6 : 2);
  ctx.fillStyle = 'rgba(5, 1, 15, 0.85)';

  // Niveau 3 : contour métallique doré qui pulse
  if (dore) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.strokeStyle = PALETTE.or;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (t.type === 'laser') {
    ctx.rotate(t.angle);
    // Socle
    cercle(ctx, 0, 0, 21);
    ctx.fill(); ctx.stroke();
    // Canon
    ctx.fillStyle = col;
    ctx.fillRect(8, -5, 26, 10);
    ctx.strokeRect(8, -5, 26, 10);
  } else if (t.type === 'plasma') {
    ctx.rotate(t.angle);
    // Socle hexagonal
    hexagone(ctx, 25);
    ctx.fill(); ctx.stroke();
    // Bouche large
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(14, -10);
    ctx.lineTo(32, -13);
    ctx.lineTo(32, 13);
    ctx.lineTo(14, 10);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else { // gravite
    // Socle
    cercle(ctx, 0, 0, 18);
    ctx.fill(); ctx.stroke();
    // Arcs orbitaux en rotation
    ctx.rotate(t.angleVisuel);
    ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(0, 0, 29, k * (Math.PI * 2 / 3), k * (Math.PI * 2 / 3) + Math.PI * 0.6);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Pastilles de niveau
  ctx.save();
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = 6;
  for (let i = 0; i < t.niveau; i++) {
    ctx.beginPath();
    ctx.arc(t.x - 8 + i * 8, t.y + 30, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function dessinerFantome(ctx) {
  if (!survol) return;
  const T = GRILLE.tailleCase;
  const x = survol.col * T, y = survol.rang * T;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.strokeStyle = survol.valide ? PALETTE.cyan : PALETTE.magenta;
  ctx.strokeRect(x + 3, y + 3, 2 * T - 6, 2 * T - 6); // bloc 2×2
  ctx.restore();
}

// ----- Formes utilitaires -----------------------------------
function cercle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
function hexagone(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
