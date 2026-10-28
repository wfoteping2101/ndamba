---
numero: 33
slug: l-analyste-njangi
titre: L'analyste Njangi : avant, pendant, après le match
partie: 8
titrePartie: L'analyse
resume: Préparer l'adversaire, coder le match en direct avec les quatorze codes de l'application, parler au banc à la mi-temps, monter une vidéo courte et juste, restituer aux jeunes et aux pros, et filmer avec un simple téléphone.
---

Il est 15 h 40 dans un stade de quartier, à la périphérie d'Abidjan. Le match des U17 commence dans vingt minutes. Sur le toit en tôle du petit local technique, un jeune analyste installe un trépied, y fixe un téléphone, branche une batterie externe et tend un pagne au-dessus de l'appareil pour le protéger du soleil. À côté de lui, une adjointe ouvre l'application sur une tablette. Elle codera la possession ; lui codera le reste. Ils n'ont ni camion vidéo ni logiciel coûteux. Ils ont deux appareils, une méthode et quatorze boutons.

À la mi-temps, l'équipe perd 1 à 0. L'entraîneur descend vers le vestiaire et l'analyste le rejoint avec trois informations : l'Indice Njangi de la première période, deux images et une phrase. « Nous avons 57 % de possession, mais nous entrons moins de deux fois dans la surface pour dix possessions. Leur pivot ferme l'axe ; c'est à gauche que nous pouvons fixer. » Quarante minutes plus tard, l'équipe a gagné.

Ce chapitre décrit le travail de l'analyste Njangi en trois temps : avant, pendant et après le match. Il s'adresse aussi à l'entraîneur qui n'a pas d'analyste, c'est-à-dire à la plupart des entraîneurs du continent. Tout ce qui suit peut être fait par un adjoint, un éducateur bénévole, un joueur blessé formé pour l'occasion. Ce qui compte, c'est la méthode et sa régularité.

## Le métier : rendre le match visible

L'analyste ne fabrique pas la vérité, il la rend visible. Son travail sert une seule personne : l'entraîneur qui doit décider, avant, pendant et après le match. Il en découle trois règles.

La première : **mesurer le modèle, pas tout le reste**. L'analyste Njangi ne compte pas tout ce qui se compte. Il compte ce qui dit si l'équipe a joué les cinq intentions et les deux réflexes. Les quatorze codes de l'application ont été choisis pour cela.

La deuxième : **peu, mais juste**. Un entraîneur pressé retient un chiffre, deux images, une phrase. Un rapport de six pages n'est pas lu ; une vidéo de 25 minutes endort les joueurs.

La troisième : **la même méthode chaque semaine**. Un chiffre isolé ne dit presque rien. Le même chiffre, mesuré de la même façon sur vingt matchs, raconte la progression d'une équipe.

## Avant le match : préparer l'adversaire

L'analyste regarde deux ou trois matchs récents de l'adversaire, si possible contre des équipes de niveau proche du nôtre. Il remplit une **fiche adversaire** d'une page, toujours dans le même ordre, en suivant les quatre moments du jeu.

| Moment | Les questions de la fiche |
|---|---|
| Leur possession | Quelle structure en possession ? Comment sortent-ils ? Vers qui va le ballon quand ils sont pressés ? |
| Leur transition défensive | Contre-pressent-ils ou se replient-ils ? Combien de joueurs restent derrière le ballon ? |
| Leur défense | Bloc haut, médian ou bas ? Quels sont les déclencheurs de leur pressing ? Où est l'espace ? |
| Leur transition offensive | Qui reçoit la première passe ? Cherchent-ils la profondeur tout de suite ? |
| Coups de pied arrêtés | Zones ou individuel ? Leurs combinaisons répétées ? |

La fiche se termine toujours par la même rubrique : **où sont nos intentions ?** Où pouvons-nous sortir, où pouvons-nous fixer, par où progresser, comment finir contre ce gardien. C'est la seule partie que les joueurs verront en entier. Une analyse de l'adversaire qui ne débouche pas sur notre plan n'est que de la curiosité.

Quand c'est possible, l'analyste code aussi l'adversaire à la vidéo et calcule son Indice Njangi. Un adversaire qui marque peu en Reprise laisse du temps après la perte : notre transition offensive devra en profiter. Un adversaire faible en Contrôle perd souvent le ballon en conduite : notre pressing sur ses porteurs paiera.

Aux joueurs, on présente l'adversaire en 10 minutes au plus, avec 6 à 8 extraits et un message par ligne. Le reste est pour le staff.

## Pendant le match : coder en direct

### Les quatorze boutons

Le codeur en direct de l'application regroupe les quatorze codes en cinq familles, dans l'ordre où l'action se déroule.

| Famille | Codes | Ce que le codeur se demande |
|---|---|---|
| Garder | PASS_OK, PASS_LOST | La passe arrive-t-elle ? |
| Avancer | PROG, LINE, FINAL3, BOX | Le ballon s'est-il rapproché du but ? |
| Fixer | FIX2, SWITCH | Avons-nous attiré pour donner ailleurs ? |
| Perdre et reprendre | LOSS, REGAIN5, REGAIN | Comment la possession finit-elle, et comment revient-elle ? |
| Finir | SHOT, SHOT_IN, GOAL | Avons-nous tiré, cadré, marqué ? |

Les définitions sont celles du chapitre 32, sans aucune variation. Quelques situations demandent une règle claire, parce qu'elles reviennent souvent.

- **Une action, plusieurs boutons.** Une passe qui avance de 15 mètres se code PASS_OK puis PROG. Une passe qui casse une ligne de deux adversaires se code PASS_OK puis LINE, jamais PROG en plus. Une conduite qui avance se code PROG ou LINE seul, sans PASS_OK.
- **Le renversement** se code PASS_OK puis SWITCH, et seulement si le bloc avait été attiré du côté de départ. Un long ballon d'un côté à l'autre sans fixation préalable n'est pas un SWITCH.
- **Le FIX2** se code quand deux adversaires sont venus sur le porteur et que le ballon reste à nous. Si le dribbleur perd le ballon, on code LOSS seulement.
- **Après une perte**, le codeur compte cinq secondes. Si le ballon revient dans ce délai, il code REGAIN5 ; sinon, la récupération suivante sera un REGAIN. Jamais les deux.
- **Le tir** se code SHOT, puis SHOT_IN s'il est cadré, puis GOAL s'il entre. Un but compte donc trois boutons.
- **Les touches** jouées à la main comptent comme des passes. Une passe qui sort en touche ou qui part directement à l'adversaire est un PASS_LOST.

L'application permet aussi de rattacher une action à un joueur. C'est utile pour le travail individuel, mais ce n'est pas nécessaire au calcul de l'Indice. Un codeur débutant laisse cette option de côté pendant ses premiers matchs.

### Coder à deux, coder seul

Une équipe senior joue souvent plusieurs centaines de passes par match : coder seul chaque passe en direct demande de l'entraînement. La meilleure organisation est un **binôme**. Le premier codeur tient la famille « Garder » et le LOSS : il suit le ballon, rien d'autre. Le second code tout le reste, et compte les cinq secondes après chaque perte. Si un troisième volontaire est disponible, il code les PASS_OK, PASS_LOST et FINAL3 de l'adversaire, ce qui donne la part de possession estimée et le field tilt.

Seul, l'analyste code tout en direct, puis il corrige après le match à la vidéo. L'Indice de la mi-temps sera un peu moins précis, mais il donnera la bonne tendance. Ce qu'il ne faut jamais faire, c'est changer de méthode d'un match à l'autre : on compare des matchs codés de la même façon.

> [!ANALYSTE] Vérifier son propre codage
> Une fois par mois, recodez à la vidéo 15 minutes d'un match codé en direct. Comparez code par code. Un écart de plus d'une action sur dix sur un code signale une définition mal comprise ou un bouton mal placé dans vos réflexes.
> Notez vos écarts habituels : la plupart des codeurs oublient des REGAIN5 et voient trop de FIX2.

### La mi-temps : quatre-vingt-dix secondes

L'entraîneur a peu de temps et beaucoup de choses à dire. L'analyste lui donne exactement trois choses, en moins de deux minutes : **un chiffre, deux images, une phrase**.

Le chiffre est l'Indice Njangi de la période, ou plutôt le sous-indice qui manque le plus. Les deux images sont deux extraits, ou deux photos de l'écran, qui montrent le problème et la solution déjà visible dans notre propre jeu. La phrase propose un ajustement en termes d'intention : « Fixons à gauche pour renverser vers notre ailier droit », pas « il faut faire mieux ».

C'est l'entraîneur qui décide. L'analyste n'entre pas dans le vestiaire avec dix idées, et il ne parle pas aux joueurs à la place de l'entraîneur.

## Après le match : la vidéo

### Découper

Dans les 24 heures qui suivent le match, l'analyste découpe la vidéo. Il ne cherche pas les plus belles actions, il cherche les plus utiles. Les codes posés en direct servent de sommaire : chaque bouton est un repère dans le temps, qui permet de retrouver en quelques secondes toutes les pertes, tous les renversements, toutes les entrées dans la surface.

Pour chaque sous-indice faible, il choisit deux ou trois extraits : une séquence où l'intention a manqué et une séquence où elle a réussi. Montrer d'abord ce que l'équipe sait déjà faire est plus efficace que d'aligner les erreurs.

### Annoter

Une flèche, un cercle, une zone colorée suffisent. On arrête l'image au moment de la décision, pas au moment de l'erreur : quand le latéral reçoit, avant qu'il ne joue en retrait, on montre l'intérieur libre entre les lignes. Une annotation répond toujours à la question « Que préparait cette passe ? » ou « Que pouvait-elle préparer ? ».

### Montrer peu mais juste

Le format qui fonctionne : une séance vidéo collective de 10 à 15 minutes au plus, avec 5 extraits pour toute l'équipe, puis 1 à 3 extraits individuels par joueur, envoyés sur son téléphone ou montrés en tête à tête. Les cinq extraits collectifs sont ceux du rapport de match (chapitre 34). Chacun porte un titre qui nomme une intention ou un réflexe : « Fixer puis renverser », « Reprendre en cinq secondes ».

## Restituer aux joueurs

Les mêmes images ne se montrent pas de la même façon à des joueurs de 14 ans et à des internationaux.

Avec les **joueurs professionnels**, on peut être direct et précis. Ils comprennent les chiffres, ils veulent savoir où ils se situent, ils acceptent la critique si elle est juste et si elle vient avec une solution. Le dialogue individuel compte plus que la séance collective : un joueur qui voit seul, avec l'entraîneur, ses trois pertes en conduite, comprend mieux qu'un joueur exposé devant le groupe. Avec les joueurs de la diaspora, qui ont parfois appris d'autres mots dans leurs clubs, on prend le temps de relier leurs habitudes au vocabulaire du Njangi.

Avec les **jeunes**, la vidéo est d'abord un outil pour apprendre à voir. On leur pose des questions plutôt que de leur donner les réponses : « Où était l'espace ? », « Qui pouvait recevoir ? », « Que prépare cette passe ? ». On montre l'équipe plus que les individus, et toujours davantage d'images réussies que d'images ratées.

> [!JEUNES] Restituer sans abîmer
> Chez les jeunes, une séance vidéo dure 5 à 10 minutes, jamais plus. Jamais d'humiliation, jamais un enfant montré seul en échec devant le groupe, jamais de classement individuel affiché.
> La vidéo se regarde après l'école, pas à sa place, dans une salle fraîche, avec de l'eau. On termine toujours par une image réussie et une question pour la prochaine séance.

## Filmer avec un téléphone et un trépied

Une fédération n'a pas besoin d'un car régie pour analyser ses matchs. Un téléphone récent, un trépied, une batterie externe et une carte mémoire suffisent à filmer une saison entière. Ce qui fait la différence, c'est le placement.

**La hauteur d'abord.** Une caméra au niveau du terrain ne montre pas les lignes. Il faut monter : en haut d'une tribune, sur un toit, sur un échafaudage, sur une petite plate-forme en bois construite une fois pour toutes. Plus la caméra est haute, plus les distances entre les lignes deviennent lisibles.

**Le centre ensuite.** La caméra se place à hauteur de la ligne médiane, pour voir les deux moitiés de la même façon. On filme à l'horizontale, en plan large, et on suit le ballon en gardant toujours au moins deux lignes de l'équipe qui défend dans l'image. Un plan trop serré montre le geste mais cache l'intention.

**La durée enfin.** On filme tout le match, sans couper, y compris les arrêts de jeu. On nomme les fichiers toujours de la même façon (date, équipe, adversaire, période) et on les copie le soir même sur deux supports différents.

> [!AFRIQUE] La chaleur, la batterie, la poussière
> Le soleil fait chauffer les téléphones, qui coupent l'enregistrement sans prévenir. Un pagne ou un parapluie tendu au-dessus de l'appareil, le mode avion et une batterie externe évitent la plupart des pannes.
> La poussière des terrains en terre se dépose sur l'objectif : un chiffon propre dans la poche du caméraman, et un second téléphone en secours si l'on peut.

Filmer des mineurs crée aussi des devoirs. Les familles donnent leur accord écrit en début de saison. Les vidéos restent dans le staff, sur des supports protégés, et ne sont jamais publiées sur les réseaux sociaux sans l'accord des parents. Une image d'enfant ne sert qu'à l'aider à progresser.

## Le njangi des analystes

Dans un njangi, chaque membre verse sa part chaque mois, même petite, et c'est la régularité qui fait la caisse. L'analyse fonctionne de la même façon. Un match codé n'apprend presque rien ; trente matchs codés de la même façon montrent une équipe qui progresse, une génération qui apprend le modèle, des repères qui se calibrent.

Une fédération qui réunit ses analystes deux fois par an, qui leur donne les mêmes définitions et les fait coder les mêmes extraits pour comparer leurs chiffres, construit quelque chose de rare : un langage commun de la mesure, des U15 à l'équipe A. Le chapitre 34 montre comment ce travail devient, chaque semaine, une page qui guide l'entraînement.
