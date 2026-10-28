# Lionceaux (Kaydoudou & BriBri) : guide d'écriture

Lis `BIBLE.md` d'abord, puis ce guide, puis `OUTLINE.md`. Le relecteur final vérifie chaque chapitre contre ces règles.

## Le livre en un paragraphe

*Le Ballon qui voyage* est un roman d'aventure et de football pour les 8 à 12 ans, écrit en français, qui se lit seul ou à voix haute en famille. Deux frères camerounais traversent cinq pays et apprennent, pièce par pièce, à « posséder le ballon avec intention ». Chaque chapitre est une vraie scène de roman (émotion, humour, suspense), jamais une leçon déguisée ; la leçon de football vient à la fin, dans le carnet de Kaydoudou. Le ton est celui d'un grand roman jeunesse : chaleureux, drôle, lumineux, plein de couleurs et d'odeurs, avec des matchs racontés comme des films.

## Règles absolues

1. **Aucun tiret long (—) ni tiret moyen (–), nulle part.** Les dialogues s'écrivent avec des guillemets « » et des incises. Chaque réplique a son propre paragraphe et ses propres guillemets. Pour une pause, utilise une virgule, deux points, des points de suspension ou des parenthèses. Vérifie avant de finir : `grep -n "[–—]" tes-fichiers` ne doit rien afficher. Le trait d'union des mots composés reste permis (« grand-mère », « peut-être », « sport-études »).
2. **Narration au passé** : passé simple et imparfait, à la troisième personne. Le point de vue suit le personnage indiqué dans l'OUTLINE (Kaydoudou ou BriBri) : on entend ses pensées, on voit par ses yeux. Les dialogues sont au présent, vivants.
3. **Longueur : 1 650 à 1 950 mots par chapitre** (sans compter le carnet). Minimum absolu : 1 550. Pas plus de 2 100.
4. **Aucun joueur réel nommé**, sauf Roger Milla (avec admiration, de façon historique). Aucun entraîneur ou dirigeant réel. Aucune marque (on dit « des crampons noirs », « une tablette », « une boisson gazeuse »). Les clubs et académies des frères sont ceux de la bible (fictifs).
5. **Faits réels exacts** : n'invente rien sur la Coupe du monde 2026 ou 2030 en dehors de ce que dit la bible.
6. **Pas d'émoji.** Les points d'exclamation sont permis (c'est un roman jeunesse), sans excès : jamais deux de suite.
7. **Respect** : aucun pays, peuple ou accent n'est ridiculisé. On rit avec les personnages, jamais contre une culture.
8. Typographie française : espace avant ; : ! ? et à l'intérieur des guillemets « comme ceci ». Écris une espace normale, le livre la remplace par une espace insécable. Nombres en lettres dans le récit jusqu'à vingt (« onze ans »), en chiffres pour les scores (« 2-1 »), les minutes (« à la 78e minute ») et les numéros de maillot (« le numéro 8 »).

## La voix

- Phrases courtes et claires, avec un rythme varié. Une idée par phrase la plupart du temps. Des phrases plus longues pour les moments calmes ou émouvants.
- Vocabulaire riche mais accessible : un mot difficile se comprend par le contexte ou s'explique en passant (« un **pivot**, ce joueur qui reçoit tous les ballons au milieu, comme le pivot d'une porte »).
- Du concret, des sens : l'odeur du ndolé, la poussière rouge qui colle aux chevilles, le froid qui pique les oreilles à Waldorf, le bruit du RER, les cigales en Catalogne, la pluie fine de Londres.
- L'humour vient surtout de BriBri (ses surnoms, ses imitations, ses inventions, ses mots d'anglais ou d'espagnol de travers) et des situations. Kaydoudou a un humour plus pince-sans-rire.
- Le camfranglais et le pidgin apparaissent dans les dialogues des frères et des amis du Cameroun, toujours compréhensibles : « On dit quoi, mola ? » (« Comment ça va, mon frère ? »), « ça mout » (« c'est difficile »), « c'est comment ? ». Pas plus de deux ou trois expressions par scène. L'anglais, l'espagnol et le catalan : de courtes phrases, traduites ou claires par le contexte.
- Les adultes parlent comme des adultes ; Mami Nyanga parle par proverbes (invente des proverbes dans l'esprit africain, simples et beaux ; ne les attribue à aucune personne réelle).
- Jamais de leçon de morale lourde. Les personnages comprennent par l'expérience, une erreur, une défaite, une conversation.

## Raconter un match

- Le lecteur doit **voir** l'action : qui a le ballon, où, qui court, où est l'espace. Utilise des repères simples (« sur le côté gauche », « juste devant la surface », « dans le dos de leur numéro 6 »).
- Alterne les plans larges (le score, le temps, la foule) et les gros plans (le souffle de Kaydoudou, le regard de BriBri vers son frère).
- Un match raconté en entier n'occupe pas plus de la moitié du chapitre. On saute les minutes sans intérêt (« La mi-temps arriva sur ce 0-0 têtu »).
- Chaque action importante doit montrer la leçon du chapitre ou en préparer une.
- Les termes de foot sont expliqués la première fois avec des mots d'enfant : « la profondeur » (l'espace derrière les défenseurs), « entre les lignes » (l'espace entre les milieux et les défenseurs adverses), etc.

## Structure de chaque chapitre

Chaque chapitre est un fichier `chapters/NN-slug.md` (NN sur deux chiffres : `01`, `02`... `40`), exactement ainsi :

```
---
numero: 7
slug: le-carnet-de-tonton-fokou
titre: Le carnet de Tonton Fokou
partie: 1
pov: Kaydoudou
resume: Une ou deux phrases pour la table des matières (pas de révélation de la fin du chapitre).
illustration: Description précise (70 à 110 mots) de LA scène à illustrer pleine page : quels personnages, que font-ils, où, à quel moment, la lumière, le cadrage (plan large, plan moyen...), l'émotion. Une seule scène, deux ou trois personnages au premier plan au maximum. Rappelle les signes distinctifs (numéro 8 vert de Kaydoudou, chaussettes dépareillées rouge et jaune de BriBri, afro de BriBri, raie de Kaydoudou) quand ils sont visibles.
---

Le texte du chapitre, en paragraphes. Pas de titre dans le texte (le titre vient de l'en-tête).

Tu peux utiliser des sauts de scène avec une ligne contenant seulement : * * *

> [!CARNET] Leçon du Ballon n°7 : Oser la passe qui traverse
> 3 à 6 lignes courtes, écrites par Kaydoudou dans son carnet, à la première personne, avec ses mots d'enfant (et parfois une remarque de BriBri entre parenthèses, écrite par-dessus son épaule).
> Une ligne peut commencer par « - » pour une petite liste.

```schema
{ le schéma de la leçon, en JSON, voir plus bas }
```
```

- Le carnet est **obligatoire** à la fin de chaque chapitre. Le numéro de la leçon est le numéro du chapitre.
- Le schéma est **obligatoire** quand la leçon se dessine sur un terrain (presque toujours). Pour une leçon purement humaine, tu peux l'omettre.
- Avant le chapitre 7, Kaydoudou écrit ses leçons sur des feuilles volantes et dans son cahier de maths ; au chapitre 7 il les recopie dans le carnet de Tonton Fokou. Le carnet s'appelle toujours « Leçon du Ballon » en en-tête.

## Le schéma (format `schema`)

Un petit dessin de terrain, vu de dessus, que le livre et l'application dessinent automatiquement. JSON strict (guillemets doubles, pas de commentaire, pas de virgule finale). Unité : **mètres**. L'équipe des frères est `a` (verts) et attaque **vers la droite**. L'adversaire est `b` (rouges). `n` = joueur neutre (jaune), `gk` = gardien.

```json
{
  "view": "grid",
  "w": 30, "h": 20,
  "players": [
    {"id": "K", "team": "a", "x": 10, "y": 10, "label": "K"},
    {"id": "B", "team": "a", "x": 22, "y": 4, "label": "B"},
    {"id": "d1", "team": "b", "x": 16, "y": 9}
  ],
  "ball": "K",
  "arrows": [
    {"from": "K", "to": "B", "kind": "pass", "n": 1},
    {"from": "B", "to": [28, 12], "kind": "run", "n": 2}
  ],
  "zones": [{"x": 18, "y": 0, "w": 12, "h": 20, "label": "l'espace", "tone": "a"}],
  "labels": [{"x": 15, "y": 1.5, "text": "la ligne à traverser"}]
}
```

- `view` : `"grid"` (un carré d'entraînement, donne `w` et `h` en mètres), `"half"` (moitié de terrain offensive, 52,5 x 68 m, le but adverse à droite), `"third"` (dernier tiers, 35 x 68 m, but à droite) ou `"full"` (terrain entier, 105 x 68 m). Pour `half`, `third` et `full`, ne donne pas `w` et `h`, et les coordonnées vont de `x` = 0 (côté gauche de la vue) à la largeur de la vue, `y` = 0 (ligne de touche du haut) à 68.
- `players` : `id` unique, `team` (`a`, `b`, `n`, `gk`), `x`, `y`, `label` facultatif (une ou deux lettres ou un numéro ; K pour Kaydoudou, B pour BriBri, M pour Mireille, etc.).
- `ball` : l'`id` du joueur qui a le ballon, ou une position `[x, y]`.
- `arrows` : `from` et `to` sont des `id` de joueurs ou des positions `[x, y]` ; `kind` : `"pass"` (passe, trait plein), `"run"` (course sans ballon, pointillés), `"dribble"` (conduite de balle, trait ondulé), `"shot"` (tir, trait épais), `"press"` (pressing, flèche rouge courte) ; `n` : ordre de l'action (1, 2, 3...).
- `zones` (facultatif) : rectangles colorés avec `tone` `"a"` (vert), `"b"` (rouge), `"n"` (jaune) ou `"soft"` (gris).
- `labels` (facultatif) : petits textes (moins de 5 mots).
- `goals` (facultatif, seulement en `grid`) : `{"x": 30, "y": 10, "side": "right", "size": "mini"}`.
- Garde-le **simple et lisible** : 3 à 9 joueurs, 1 à 4 flèches. Un enfant de 9 ans doit comprendre l'idée en cinq secondes.

## Chaque chapitre doit avoir

- Une première phrase qui accroche (une image, un bruit, une réplique, une question).
- Au moins un moment drôle et un moment d'émotion.
- Une scène de football (match, entraînement, jeu de rue, rondo...) sauf indication contraire dans l'OUTLINE.
- Une fin qui donne envie de tourner la page (une question, une surprise, une décision, une image forte).
- La leçon du carnet, reliée à ce qui s'est passé dans le chapitre.

## Avant de rendre ton travail

1. `grep -n "[–—]" chapters/*.md` ne doit rien afficher dans tes fichiers.
2. Lance le vérificateur depuis le dossier `tome1` : `node ../tools/check.mjs chapters/NN-*.md`. Il compte les mots du récit (hors carnet), repère les tirets interdits, vérifie l'en-tête et valide chaque bloc `schema`. Chaque chapitre doit afficher `ok`.
3. Pour voir tes schémas dessinés : `node ../tools/check.mjs --render /tmp/schemas-NN chapters/NN-*.md`, puis convertis un SVG en PNG (`rsvg-convert` ou le script `node ../tools/svg2png.mjs fichier.svg`) et regarde-le avec l'outil Read. Corrige tout schéma illisible (joueurs qui se chevauchent, flèches qui traversent des joueurs, texte coupé).
4. Relis la continuité avec la bible et l'OUTLINE : âges, noms, numéros, lieux, ce que les personnages savent déjà.
