# Lionceaux : direction artistique (v2, octobre 2026)

Skill appliqué : `.claude/skills/cinematic-children-book/SKILL.md`. Personnages : `CHARACTERS.md`. Inventaire des images : `inventory.json` (généré par `node tools/art_prompts.mjs` à partir de `scenes.mjs`). Journal de production : `assets.json`.

## 1. Ce qui change

La v1 (aquarelle douce, inspirée de l'animation japonaise classique) est remplacée par un **style cinématographique peint, en cel-shading**. Les images v1 sont conservées dans `_v1-ghibli-style/` sur le poste de génération et servent seulement de références d'identité.

## 2. Le verrou de style (à recopier tel quel dans chaque prompt)

> Cinematic stylized 3D-animation look translated into a hand-painted illustration: deliberate cel-shaded shadow shapes with two or three clean value steps, sculpted dimensional forms, angular but appealing shape design, visible painterly brush texture on surfaces and backgrounds, expressive child faces with clear readable features, rich saturated colour held together by one dominant palette, controlled dramatic lighting with a clear key light and a coloured rim light, atmospheric depth with soft haze between planes, composed like animated-feature key art. Warm, joyful, adventurous, made for readers aged 8 to 12.

Références de qualités (jamais nommées dans les prompts, pour ne pas attirer de personnages protégés) : les cinématiques de VALORANT pour les silhouettes graphiques, le design des formes et l'éclairage franc ; Arcane pour les surfaces peintes et les décors en profondeur. Adapté à l'enfance : chaleur, émerveillement, humour, amitié, aventure ; proportions d'enfants ; aucune imagerie de combat adulte, aucune noirceur.

**À éviter dans chaque image** : clip-art et personnages interchangeables ; aplats sans profondeur ; peau plastique, rendu jouet brillant, visages aérographiés ; visages adultes photoréalistes sur des corps d'enfants ; néon, bloom, lens flare ou obscurité boueuse ; détails partout ; mélange aquarelle, vectoriel et 3D ; proportions chibi ; tout texte, logo, marque ou filigrane (seuls les numéros de maillot prévus par la scène sont permis).

## 3. Règles de composition

- Un point focal enfant, lisible en vignette ; une silhouette forte au premier plan devant un monde vaste.
- Chemins, portails, cadres architecturaux et lumière qui guident l'œil vers la destination ou l'enjeu.
- Ciels saturés et lumière caractéristique de chaque pays : Cameroun or et terre rouge, États-Unis bleu froid et lumière de projecteurs, France or d'automne et gris argent, Espagne lumière méditerranéenne blanche et turquoise, Angleterre pluie, brume et projecteurs.
- Rythme : plans larges pour la découverte et l'échelle, plans moyens pour les relations, gros plans pour l'émotion et les indices, plans dynamiques pour l'action décisive, images calmes pour la réflexion.
- Les deux frères agissent : chaque fois que la scène le permet, chacun fait quelque chose qui compte.
- Pages intérieures : pleine page 2:3 (6 x 9 pouces, impression avec fond perdu), aucun visage ni indice essentiel dans les 8 % proches du bord intérieur (reliure).

## 4. La couverture et le système de série

Format 2:3 (1800 x 2700 px pour le master composé, 6 x 9 pouces).

- **Zone titre en haut (30 % de la hauteur)** : ciel calme, sans détail. Le mot-marque **LIONCEAUX** en capitales grasses condensées blanches avec un contour sombre et une ombre portée chaude ; dessous, le numéro du tome en chiffres romains dorés (**I**).
- **Les deux frères** au premier plan ou au plan moyen, de trois quarts pour que les deux visages restent lisibles, avec une interaction claire.
- **Une destination** au loin, sur l'axe d'un chemin ou d'un portail.
- **Bas de couverture** : une fine bande de pagne rouge et jaune, le titre du tome en serif blanc (« Le Ballon qui voyage »), la ligne « Une aventure de Kaydoudou & BriBri » et le nom de l'auteur entre deux filets dorés.
- Le lettrage est **composé séparément** (`tools/compose_cover.mjs`), jamais peint par le générateur, pour rester exact et modifiable.
- Pour les tomes suivants : même typographie, même placement ; seuls changent le décor, la pose, la palette dominante et l'enjeu. Tome 1 : or du couchant, terre rouge, ciel turquoise. Les tomes 2 à 6 n'ont pas encore de couverture : on n'en fabrique pas.
- Aucune critique, étoile, récompense ou recommandation inventée, ni sur la couverture ni ailleurs.

## 5. Ordre de production

1. Planches personnages : `sheet-brothers` (les deux ensemble, échelle, pose héroïque), `sheet-turnaround`, `sheet-expressions`, `sheet-adults`.
2. Trois couvertures brouillons (`cover-rough-a/b/c`), évaluées sur : reconnaissance des deux frères, promesse d'aventure, lisibilité en vignette, hiérarchie, adéquation aux 8 à 12 ans. Puis `cover-art`.
3. Une illustration intérieure représentative (`ch07`), revue de cohérence.
4. Les autres : `part1` à `part5`, `ch01` à `ch40`, chacune avec `sheet-brothers`, `sheet-adults` et `ch07` en références.
5. Intégration : lecteur web, PDF, application.

## 6. Contrôle qualité (avant intégration)

Refaire toute image où : l'identité, l'âge, la peau ou la taille relative changent ; les chaussettes sont inversées ou manquent ; un maillot ou un numéro est faux pour la partie ; l'anatomie ou un objet est impossible ; l'expression contredit la scène ; le style dévie ; du texte apparaît ; le détail noie l'action.
