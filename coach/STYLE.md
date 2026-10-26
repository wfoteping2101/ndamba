# La Méthode Njangi : guide d'écriture (livre pour entraîneurs, analystes et managers)

Lis ce guide, puis `OUTLINE.md`, puis `../tome1/BIBLE.md` (seulement la partie « Le Njangi », pour la métaphore commune aux deux livres).

## Le livre en un paragraphe

*La Méthode Njangi. Posséder avec intention* est un manuel professionnel, en français, pour les entraîneurs (des éducateurs de jeunes aux entraîneurs de sélection), les analystes vidéo et data, les directeurs techniques et les dirigeants de fédérations africaines. Il propose ce qui manque à la plupart des nations africaines : **une philosophie de jeu commune**, du plus jeune âge à l'équipe A, construite sur la possession avec intention et sur les forces des footballeurs africains. Son mantra : **qu'une nation africaine gagne la Coupe du monde en 2030 ou en 2034.** Il est concret (principes, comportements, séances, semaines, indicateurs), honnête sur les difficultés (terrains, moyens, instabilité des staffs) et ambitieux. Il est le compagnon de l'application Njangi (bibliothèque d'exercices, planification, analyse en direct) et du roman jeunesse *Kaydoudou & BriBri*.

## Règles absolues

1. **Aucun tiret long (—) ni tiret moyen (–).** Virgules, deux points, parenthèses, ou « à » pour les intervalles (« 12 à 15 minutes »). Le trait d'union des mots composés est permis. Vérifie : `grep -n "[–—]" fichiers` ne doit rien afficher.
2. **Pas d'émoji, pas de point d'exclamation** (sauf dans une consigne criée entre guillemets : « Tourne ! »).
3. **Ne cite aucun livre, aucun auteur, aucune méthode commerciale d'un tiers.** Ce livre tient debout tout seul. Tu peux nommer des concepts du domaine public du football (rondo, jeu de position, troisième homme, périodisation, contre-pressing, défense de repos, PPDA, xG) et les expliquer avec tes mots. Pas d'entraîneur réel nommé, pas de joueur réel nommé.
4. **Faits exacts uniquement.** Voici les faits vérifiés que tu peux utiliser ; n'invente aucun autre chiffre historique ou statistique réel :
   - Meilleurs parcours africains en Coupe du monde : Cameroun quart de finale en 1990 ; Sénégal quart de finale en 2002 ; Ghana quart de finale en 2010 ; Maroc demi-finaliste en 2022 (premier pays africain en demi-finale, 4e place).
   - Coupe du monde 2026 (États-Unis, Canada, Mexique, 48 équipes) : 10 nations africaines qualifiées, 9 en phase à élimination directe (le précédent record était 3) ; le Maroc atteint les quarts de finale (battu 2-0 par la France) ; l'Égypte perd 3-2 contre l'Argentine en huitièmes après avoir mené 2-0 ; la RD Congo mène 1-0 contre l'Angleterre en seizièmes puis perd sur deux buts tardifs ; l'Afrique du Sud atteint la phase à élimination directe pour la première fois ; le Cameroun n'était pas qualifié. L'Espagne est championne du monde 2026 en battant l'Argentine 1-0 après prolongation.
   - Aucune nation africaine n'a encore joué une finale de Coupe du monde.
   - Coupe du monde 2030 : Maroc, Espagne, Portugal (trois matchs du centenaire en Uruguay, Argentine, Paraguay). Coupe du monde 2034 : Arabie saoudite.
   - Les fenêtres internationales FIFA réunissent les sélections environ 9 à 10 jours.
   Pour tout autre chiffre (physiologie, charge, chaleur), donne des repères généraux et prudents (« en général », « une fourchette courante est ») et jamais de fausse précision. Si tu as un doute, formule-le comme un principe, pas comme un chiffre.
5. **Sécurité et protection des enfants** : chaque fois qu'on parle de jeunes, rappelle les bons réflexes (hydratation, chaleur, charge adaptée à l'âge, jamais d'humiliation, protection de l'enfance, école d'abord).
6. Typographie française (espace avant ; : ? et dans les guillemets « »). Chiffres en chiffres pour les mesures, durées, effectifs (« 4 contre 2 », « 20 x 15 m », « 3 x 4 min »).

## La voix

- Celle d'un directeur technique expérimenté qui parle à des collègues : direct, précis, respectueux, convaincu, jamais arrogant.
- Concret avant abstrait : une scène de match ou d'entraînement, puis le principe, puis comment l'entraîner, puis comment le mesurer.
- Chaque principe se termine par des **comportements observables** (ce qu'on voit sur le terrain quand le principe est appliqué) et, quand c'est utile, un **indicateur** pour l'analyste.
- Les termes techniques sont expliqués à leur première apparition, en **gras**.
- Pas de jargon gratuit, pas de mots creux (« révolutionnaire », « ultime »).
- Le Njangi est une métaphore fondatrice, utilisée avec mesure (une ou deux fois par chapitre), jamais comme un gadget.
- Ce livre parle à l'Afrique entière : exemples du Cameroun, du Sénégal, du Maroc, de la Côte d'Ivoire, du Nigeria, de la RD Congo, du Ghana, etc., sans hiérarchie et sans cliché. Il parle aussi de la diaspora et des binationaux, avec respect.

## Structure d'un chapitre

Fichier `chapters/NN-slug.md` (NN sur deux chiffres) :

```
---
numero: 5
slug: les-cinq-intentions
titre: Les cinq intentions de la possession
partie: 2
titrePartie: Le modèle de jeu Njangi
resume: Une ou deux phrases pour la table des matières.
---

Ouverture (2 à 4 paragraphes) : une situation concrète et la question à laquelle répond le chapitre.

## Titres de section (## et ### seulement)
...
```

- **Longueur : 1 800 à 2 400 mots par chapitre.**
- Encadrés disponibles (à utiliser 2 à 4 fois par chapitre, pas plus) :
  - `> [!NJANGI] Titre` : un principe clé du modèle, en une à quatre lignes.
  - `> [!AFRIQUE] Titre` : le contexte africain (terrains, chaleur, moyens, diaspora, organisation).
  - `> [!ANALYSTE] Titre` : comment mesurer ou observer ce principe (indicateur, définition, seuil indicatif).
  - `> [!JEUNES] Titre` : adaptation pour les jeunes.
  - `> [!ATTENTION] Titre` : erreur fréquente ou sécurité.
  Chaque ligne d'un encadré commence par `> `.
- Tableaux Markdown permis (simples, 2 à 5 colonnes).
- Listes à puces permises, mais le livre reste majoritairement en prose.
- Renvois aux exercices : écris le code entre crochets doubles, par exemple `[[R02]]` ou `[[T01]]`, le livre en fera un lien vers l'exercice. N'utilise que les codes de la liste de l'OUTLINE.
- Schémas : tu peux insérer des schémas de terrain avec un bloc ```schema (même format JSON que le roman, voir `../tome1/STYLE.md`, section « Le schéma »), 1 à 3 par chapitre quand ils aident vraiment. L'équipe qui applique le Njangi est `a` (verts) et attaque vers la droite.

## Avant de rendre

- `grep -n "[–—]" chapters/NN-*.md` ne doit rien afficher.
- `node ../tools/check.mjs chapters/NN-*.md` doit afficher `ok` (il vérifie les tirets et les schémas).
- Compte tes mots (`wc -w`) : 1 800 à 2 400 par chapitre.
