# NÉODRIVE — Défense Orbitale

Jeu de tower defense spatial, navigateur. Projet perso solo.

## Règles permanentes
- Tout en FRANÇAIS : code, noms de variables et fonctions, commentaires, UI.
- Réponses concises, orientées action. Pas d'explications non demandées.
- Choix technique ouvert → 2 options max, avantage/inconvénient, ta reco, puis tu attends.
- Consigne ambiguë → tu demandes, tu ne supposes pas.
- Aucune dépendance externe, aucun build step, aucune refonte d'archi sans mon accord.
- Code lisible par un débutant. Pas de sur-abstraction.
- Designs originaux uniquement, pas de reprise d'univers existant.

## Stack
HTML5 Canvas + JavaScript vanilla, modules ES6. Ouvrable direct dans le navigateur.

```
index.html
style.css
js/
  main.js       point d'entrée, init
  moteur.js     boucle de jeu, gestion du temps
  rendu.js      dessin Canvas, glow néon, cache hors écran
  carte.js      grille, trajectoire, placement
  tours.js      tourelles, améliorations, tir
  ennemis.js    types d'ennemis, déplacement, PV
  boss.js       Le Dreadnought (vague 10)
  vagues.js     séquencement des vagues, spawn
  ui.js         HUD, menus, écrans de fin
  config.js     TOUTES les valeurs d'équilibrage + PALETTE
```

## Direction artistique
Synthwave spatial. Fond `#05010f`, champ d'étoiles en parallaxe.

Palette (dans `config.js`, objet `PALETTE`, jamais en dur ailleurs) :
- cyan `#00f0ff` · magenta `#ff00c8` · violet `#a020f0` · or `#ffd700`

Glow néon via `shadowBlur`. Vaisseaux en vectoriel Canvas (formes géométriques
+ glow), pas de sprites externes.

Monnaie = **Bitcoin**, symbole `₿` sur tous les montants.

## Contenu v1

### Tourelles (3 types, 3 niveaux d'amélioration chacune)

| Tourelle | Effet |
|---|---|
| Laser | dégâts directs, cadence rapide |
| Champ gravitationnel | ralentit les ennemis dans sa zone |
| Canon à plasma | dégâts de zone |

Progression visuelle des améliorations :
`niv.1 néon cyan` → `niv.2 néon magenta` → `niv.3 DORÉE` (glow or intense,
contour métallique, pulsation). Chaque niveau : + dégâts, + portée, + cadence.

### Ennemis (formes vectorielles originales)

| Ennemi | Forme | Profil |
|---|---|---|
| Éclaireur | petit triangle effilé | rapide, peu de PV |
| Croiseur | losange allongé blindé | lent, beaucoup de PV |
| Drone orbital | hexagone | volant, ignore une partie du parcours |

### Vagues
10 vagues, difficulté croissante.

### Vague 10 — LE DREADNOUGHT (boss, très difficile)
- Immense vaisseau triangulaire : cale allongée à pointe avant, superstructure dorsale
- PV ≥ 25× un croiseur, déplacement lent
- Bouclier régénérant : à briser avant d'entamer la coque
- Immunisé au ralentissement du champ gravitationnel
- Fait apparaître des éclaireurs pendant sa progression
- Barre de vie dédiée en haut de l'écran
- Entrée en scène : zoom + tremblement de caméra
- Destruction : explosion néon en plusieurs phases

### Systèmes
Économie ₿ (gains par kill, coûts de pose et d'amélioration), intégrité de la
base (vies), écran victoire/défaite, bouton rejouer, meilleure vague atteinte
en `localStorage`.

## Ordre de développement
À la fin de chaque étape : **STOP**. Tu montres ce qui est jouable et tu attends
ma validation avant de passer à la suivante.

1. Squelette + boucle de jeu + fond étoilé + carte
2. Ennemis + déplacement sur trajectoire
3. Tourelles + tir + collisions
4. Système des 3 améliorations avec rendu doré
5. Vagues + économie ₿
6. Boss vague 10
7. HUD néon
8. Équilibrage

## Performance
60 fps stables, `requestAnimationFrame`. `shadowBlur` coûte cher : mettre en
cache les sprites néon et le boss dans des canvas hors écran.

## config.js
Doit contenir, commenté et regroupé par section : PV, dégâts, portées, cadences,
vitesses, coûts ₿ de pose et des 3 améliorations, gains par ennemi, composition
des 10 vagues, stats complètes du boss, PALETTE. Objectif : régler tout
l'équilibrage sans toucher au reste du code.
