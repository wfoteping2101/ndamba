# Les 50 exercices Njangi : format et liste

Chaque exercice est un fichier JSON `drills/CODE.json` (par exemple `drills/R01.json`), **bilingue français et anglais**. Ces fichiers alimentent à la fois le livre (une fiche d'une page par exercice, avec le schéma) et l'application (bibliothèque d'exercices, planificateur de séances). Lis `STYLE.md` (règles d'écriture : pas de tiret long ni moyen, pas d'émoji, pas de nom réel) et le format des schémas dans `../tome1/STYLE.md` (section « Le schéma »).

## Format (JSON strict, UTF-8)

```json
{
  "id": "R02",
  "family": "rondo",
  "order": 2,
  "ages": "U11+",
  "players": { "min": 7, "max": 7, "fr": "7 joueurs (5 contre 2)", "en": "7 players (5 v 2)" },
  "space": { "w": 14, "h": 14 },
  "duration": { "fr": "4 x 3 min, 1 min de récupération", "en": "4 x 3 min, 1 min rest" },
  "minutes": 15,
  "md": ["MD-4", "MD-2", "MD-1"],
  "intensity": "medium",
  "intentions": ["fixer", "respirer"],
  "skills": ["scan", "passe", "decision"],
  "pieces": ["la carte"],
  "fr": {
    "title": "Rondo Avi Ramon",
    "subtitle": "5 contre 2 avec la règle de la pause",
    "objective": "Une ou deux phrases : ce que l'exercice entraîne et pourquoi.",
    "organisation": ["phrase", "phrase", "..."],
    "rules": ["phrase", "..."],
    "coaching": ["consigne courte, au présent ou à l'impératif", "..."],
    "progressions": ["...", "..."],
    "regressions": ["...", "..."],
    "measure": "Ce que l'entraîneur ou l'analyste compte pour savoir si c'est réussi.",
    "story": "Facultatif : une phrase qui relie l'exercice à Kaydoudou et BriBri (pour les éducateurs de jeunes)."
  },
  "en": {
    "title": "...", "subtitle": "...", "objective": "...",
    "organisation": ["..."], "rules": ["..."], "coaching": ["..."],
    "progressions": ["..."], "regressions": ["..."], "measure": "...", "story": "..."
  },
  "diagram": { "view": "grid", "w": 14, "h": 14, "players": [], "ball": "a1", "arrows": [] },
  "diagram2": null
}
```

Valeurs autorisées :
- `family` : `technique` (technique et combinaisons, code C), `rondo`, `position`, `ssg` (petit jeu), `lsg` (grand jeu), `phase`, `transition`, `finishing`.
- `md` : un ou plusieurs de `MD-4`, `MD-3`, `MD-2`, `MD-1`, `MD+1`, `youth` (séance de jeunes sans match proche).
- `intensity` : `low`, `medium`, `high`, `very-high`.
- `intentions` : un ou plusieurs de `sortir`, `progresser`, `fixer`, `finir`, `respirer`, `reprendre`, `regarder-devant`.
- `skills` (les dix compétences du chapitre 25) : `scan`, `controle`, `passe`, `conduite`, `dribble-njangi`, `appels`, `communication`, `protection`, `contre-pression`, `decision`.
- `pieces` : un ou plusieurs de `le cœur`, `la raison`, `les yeux`, `la carte`, `le souffle`.
- `diagram` : obligatoire, format `schema` du roman (équipe `a` verte qui attaque vers la droite, `b` rouge, `n` neutres jaunes, `gk` gardien vert, `gkb` gardien adverse). Pour une `grid`, `w` et `h` du schéma = `space.w` et `space.h`. Lisible : 4 à 16 joueurs, 2 à 6 flèches numérotées, des labels courts. Les petits buts : `goals` avec `"size": "mini"`.
- `diagram2` : facultatif (une progression ou une deuxième phase), même format, ou `null`.

Longueur : chaque liste contient 3 à 6 éléments ; chaque phrase est courte (moins de 25 mots). Une fiche complète en français fait 250 à 400 mots. L'anglais est une vraie traduction naturelle (anglais de terrain), pas un mot à mot.

Vérification : `node ../tools/check_drills.mjs drills/R0*.json` (valide le JSON, les champs, les valeurs autorisées, le schéma et les tirets interdits). Pour voir un schéma : `node ../tools/check_drills.mjs --render /tmp/drills drills/R02.json` puis `node ../tools/svg2png.mjs /tmp/drills/R02.svg` et regarde l'image avec l'outil Read.

## La liste des 50 (titre français, idée, à respecter)

### A. Rondos (R)
- **R01 Le taureau** : rondo 4 contre 1 dans un carré de 8 à 10 m ; deux touches puis une touche ; apprendre à offrir un angle. U9+.
- **R02 Rondo Avi Ramon** : 5 contre 2 en 14 x 14 m avec la règle de la pause (un point bonus quand un joueur attire un défenseur puis joue dans son dos). U11+.
- **R03 Le pivot au centre** : 4 contre 2 avec un joker au centre du carré ; une passe par le joker vaut un point (jouer à travers le bloc). U12+.
- **R04 Les deux carrés** : deux carrés de 10 x 10 m côte à côte, 4 contre 2 dans l'un ; au signal ou après 6 passes, le ballon change de carré et deux défenseurs (et un seul autre) suivent (renverser après avoir fixé). U12+.
- **R05 Le rondo des yeux** : 6 contre 3, l'entraîneur montre une couleur (chasuble ou plot) derrière le receveur ; le receveur doit l'annoncer avant de jouer (scan). U11+.
- **R06 Le rondo qui avance** : rondo 4 contre 2 en trois zones alignées ; après 5 passes, le groupe doit faire passer le ballon dans la zone suivante (progresser). U13+.
- **R07 Le rondo njangi** : 5 contre 2, un point seulement quand les 5 joueurs ont touché le ballon dans la même séquence (tout le monde verse sa part). U10+.
- **R08 Rondo des cinq secondes** : 5 contre 2 ; quand un défenseur récupère, les 2 défenseurs deviennent attaquants avec le joueur qui a perdu ; les autres ont 5 secondes pour reprendre le ballon (contre-pression). U13+.

### B. Jeux de position (P)
- **P01 Le losange** : 4 contre 4 + 3 neutres en 30 x 25 m ; structure en losange de l'équipe en possession ; 8 passes = 1 point. U12+.
- **P02 Les cinq couloirs** : 5 contre 5 + 2 neutres en 40 x 30 m divisé en 5 couloirs ; interdit d'avoir 2 joueurs de la même équipe dans un couloir sur la même ligne ; point après un renversement d'un couloir extérieur à l'autre. U13+.
- **P03 Le troisième homme** : trois zones (8 x 20 m chacune) ; 3 contre 1 dans les zones extrêmes ; le ballon doit passer de la zone 1 à la zone 3 en utilisant un joueur de la zone centrale qui remet en une touche (combinaison du troisième homme). U13+.
- **P04 Sortir à quatre** : gardien + 4 relanceurs contre 3 attaquants, dans le premier tiers ; point quand le ballon traverse la ligne des attaquants vers un joueur relais (ou un mini-but). Les attaquants qui récupèrent marquent dans le grand but. U14+.
- **P05 Entre les lignes** : 6 contre 6 sur un terrain de 40 x 30 m divisé en 3 zones ; un point quand un joueur reçoit dans la zone centrale entre deux adversaires et se retourne pour jouer vers la zone avant. U13+.
- **P06 Le pivot doit toucher** : 7 contre 7 + 3 neutres ; un point uniquement si le ballon est passé par le pivot pendant la séquence ; travail du 6. U14+.
- **P07 Attirer pour libérer** : 4 contre 3 dans une moitié d'un rectangle de 40 x 25 m ; après avoir attiré le pressing (6 passes ou fixation), passe dans l'autre moitié où un 3 contre 2 attaque un mini-but. U13+.
- **P08 Les trois supériorités** : jeu en vagues : 2 contre 1, puis 3 contre 2, puis 4 contre 3 vers un but avec gardien ; l'entraîneur nomme la supériorité à créer (numérique, de position, de qualité). U12+.
- **P09 Lent, lent, VITE** : 6 contre 6 + 2 neutres ; après au moins 4 passes de circulation, une passe vers une cible (joueur placé sur la ligne de fond adverse) vaut 1 point, 2 points si elle arrive en moins de 3 secondes après la première passe vers l'avant. U13+.
- **P10 Respirer** : 8 contre 8 + 4 neutres sur un grand espace (55 x 45 m), en fin de séance ou en état de fatigue ; objectif garder le ballon 45 secondes ; apprendre à utiliser la possession pour récupérer. U15+.

### C. Petits jeux (S)
- **S01 Quatre petits buts** : 3 contre 3 + 4 mini-buts (deux par équipe, sur les côtés de la ligne de fond) en 25 x 20 m ; marquer dans le but le moins protégé (lire, décider, renverser). U9+.
- **S02 La zone d'entrée** : 4 contre 4 avec une zone de 5 m derrière chaque ligne de fond ; on marque en entrant dans la zone en conduite ou en recevant une passe dedans (progresser). U10+.
- **S03 Les appuis** : 5 contre 5 + 2 appuis sur les lignes de fond (un par équipe, joker en remise une touche) ; but valable seulement après une remise d'appui. U12+.
- **S04 Le dribble njangi** : 4 contre 4 avec gardiens en 35 x 25 m ; un but vaut 2 points s'il est précédé d'une conduite ou d'un dribble qui a attiré deux défenseurs. U11+.
- **S05 Six buts** : 6 contre 6 sans gardien, trois mini-buts par équipe sur la largeur ; fixer d'un côté pour marquer de l'autre. U12+.
- **S06 Futsal : petit espace, grande tête** : 4 contre 4 sur terrain réduit (ou futsal), ballon plus lourd ; contrôle de la semelle, scan obligatoire, deux touches maximum dans sa moitié. U9+.
- **S07 Les lignes traversées** : 5 contre 5 + gardiens ; une passe qui traverse une ligne de deux adversaires vaut 1 point en plus des buts (2 points le but). U12+.
- **S08 Jouer avant le contact** : 3 contre 3 en 20 x 15 m avec mini-buts ; dans la zone centrale, deux touches maximum ; apprendre à lâcher le ballon avant le duel et à contrôler loin de la pression. U11+.

### D. Grands jeux (L)
- **L01 Les couloirs libres** : 8 contre 8 + gardiens sur 70 x 50 m ; les couloirs extérieurs (6 m) ne peuvent être occupés que par un attaquant (ailier) sans défenseur ; travail de la largeur et du renversement. U14+.
- **L02 Traverser trois lignes** : 9 contre 9 + gardiens, terrain divisé en 3 tiers ; un but compte double si l'action a traversé les trois tiers en moins de 8 passes. U14+.
- **L03 Sortir sous le pressing** : 10 contre 10 sur trois quarts de terrain, l'équipe en possession sort depuis son gardien face à un pressing haut ; 1 point quand elle franchit la ligne médiane en possession, 3 points le but ; l'équipe qui presse marque en récupérant dans le premier tiers et en tirant en moins de 8 secondes. MD-3, U15+.
- **L04 Une équipe, une idée** : 11 contre 11 à thème (match d'application du modèle), l'entraîneur fixe deux règles du modèle (par exemple défense de repos à 3+2 et pivot qui touche dans chaque sortie) et des points bonus pour les comportements. U15+.
- **L05 Largeur maximale** : 7 contre 7 + gardiens sur une moitié de terrain dans toute sa largeur ; but valable seulement si le ballon a touché les deux couloirs extérieurs dans l'action. U13+.
- **L06 Le terrain penche** : 10 contre 10 + gardiens ; chaque minute de possession dans le dernier tiers adverse rapporte 1 point (chronométré par un adjoint), en plus des buts ; illustrer le field tilt. U15+.

### E. Phases de jeu (F)
- **F01 Sortie à trois contre deux** : gardien + 2 centraux + pivot contre 2 attaquants (+1 ensuite), départ du gardien ; atteindre un intérieur ou un latéral libre au-delà de la première ligne. U14+.
- **F02 Le latéral intérieur** : sortie de balle en structure 3-2 où un latéral rentre à côté du pivot ; 8 joueurs en possession contre 6 ; arriver au milieu de terrain en possession. U15+.
- **F03 Le demi-espace** : attaque de 6 contre 5 + gardien sur un tiers et demi ; progresser par le demi-espace (combinaison intérieur, ailier, latéral) et entrer dans la surface. U15+.
- **F04 Fixer et renverser** : surcharge de 5 joueurs d'un côté contre 4, puis renversement vers un 2 contre 1 de l'autre côté ; finition. U14+.
- **F05 Contre un bloc bas** : 8 contre 7 + gardien dans le dernier tiers ; points bonus pour les centres en retrait et les entrées dans la surface par le demi-espace ; patience et finition. U15+.
- **F06 La défense de repos** : 7 contre 6 en attaque placée, avec obligation de garder 3 + 2 joueurs derrière le ballon ; à la perte, transition 4 contre 3 vers un but ou des mini-buts à l'autre bout. U15+.

### F. Transitions (T)
- **T01 Les cinq secondes** : jeu à 6 contre 6 + gardiens ; quand une équipe perd le ballon, elle marque 1 point si elle le reprend dans les 5 secondes ; l'entraîneur compte à voix haute. U13+.
- **T02 Regarder devant** : 4 contre 4 dans une zone centrale, après récupération transition immédiate vers un but adverse avec 3 contre 2 ; règle : la première passe après récupération doit aller vers l'avant si possible. U13+.
- **T03 Double transition** : 4 contre 4 sur un terrain de 40 x 30 m, une équipe de 4 attend derrière chaque but ; l'équipe qui perd sort, celle qui attendait entre. Enchaînement des transitions. U13+.
- **T04 Le déclencheur** : 6 défenseurs (bloc médian) contre 6 + gardien en possession ; quand le coach crie le déclencheur ou qu'une passe en arrière est jouée, pressing collectif ; récupération et finition en moins de 10 secondes. U15+.
- **T05 La contre-attaque** : départ de 3 contre 2 puis 4 contre 3 avec un défenseur qui revient ; finir en moins de 8 secondes. U12+.
- **T06 Attaquer puis défendre** : 5 contre 4 vers un but ; à la perte ou après le tir, l'équipe qui attaquait défend un 3 contre 4 dans l'autre sens avec sa défense de repos. U14+.

### G. Finition avec intention (G)
- **G01 Le centre en retrait** : circuit de finition : combinaison sur le côté, entrée dans la surface par le demi-espace, centre en retrait vers deux attaquants qui arrivent. U12+.
- **G02 Le une-deux du Njangi** : circuit et jeu 2 contre 1 : une-deux puis frappe, des deux côtés ; finir en une ou deux touches. U10+.
- **G03 Troisième homme et frappe** : pivot vers attaquant qui remet vers un intérieur lancé qui frappe ; puis avec un défenseur passif, puis actif. U13+.
- **G04 Isoler l'ailier** : jeu à 4 contre 3 qui fixe un côté, puis renversement vers l'ailier isolé en 1 contre 1 ; finition. U12+.
- **G05 Finir dans la surface** : 4 contre 3 + gardien dans la surface et ses abords ; tirs à une ou deux touches ; les tirs de loin ne comptent qu'à moitié. U13+.
- **G06 Le but du Njangi** : déroulé collectif à 11 sans opposition puis avec opposition partielle : le ballon part du gardien, passe par au moins huit joueurs différents et finit par un tir ; les joueurs doivent nommer l'intention à chaque étape. U12+.
