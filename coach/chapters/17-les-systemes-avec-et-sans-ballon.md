---
numero: 17
slug: les-systemes-avec-et-sans-ballon
titre: Les systèmes avec et sans ballon
partie: 4
titrePartie: La tactique Njangi
resume: Les principes avant les chiffres. Comment un système de départ devient un 3-2-5, un 2-3-5 ou un 3-1-6 avec le ballon, un 4-4-2, un 4-5-1 ou un 5-4-1 sans lui, comment les couloirs et les hauteurs sont occupés, ce que coûte la bascule, et quel système choisir selon l'âge et l'effectif.
---

Mi-temps d'un match de championnat U19, dans un vestiaire de Yaoundé. Sur le tableau blanc, l'adjoint a écrit « 4-3-3 », le système de la feuille de match. L'analyste s'approche, efface le chiffre et colle trois photos tirées de la vidéo de la première période. Sur la première, nous avons le ballon dans le camp adverse : trois joueurs derrière, deux au milieu, cinq devant. Sur la deuxième, l'adversaire relance et nous défendons à quatre, quatre et deux. Sur la troisième, prise deux secondes après une perte, l'équipe n'a plus de forme du tout : sept joueurs devant le ballon, trois derrière, et quarante mètres vides entre les deux.

« Alors, quel est notre système ? » demande l'entraîneur. Personne ne répond, parce que la vraie réponse dérange : nous en avons deux, et nous ne savons pas encore passer de l'un à l'autre.

Ce chapitre ouvre la partie consacrée à la tactique du Njangi. Il ne propose pas de système miracle : il explique comment lire un système, comment le transformer avec et sans le ballon, et comment choisir celui qui convient à ses joueurs. Les chapitres 18 à 23 détaillent ensuite chaque phase, de la sortie de balle au plan de match.

## Les principes avant les chiffres

Le **système de départ** est l'adresse de chaque joueur au coup d'envoi : 4-3-3, 4-2-3-1, 3-4-3. La **structure** est la forme réelle que prend l'équipe dans un moment du jeu. Le Njangi en distingue deux, la **structure avec ballon** et la **structure sans ballon**, et il donne un nom au passage de l'une à l'autre : la **bascule**. Une équipe inscrite en 4-3-3 sur la feuille peut attaquer en 3-2-5 et défendre en 4-4-2 dans le même match. C'est même le cas le plus fréquent.

Les chiffres ne disent donc presque rien. Le Njangi pose quatre questions à n'importe quel système, le sien comme celui de l'adversaire.

1. **Avec le ballon**, occupe-t-il les cinq couloirs sur la ligne la plus haute, et offre-t-il un joueur libre derrière la première ligne adverse ?
2. **À la perte**, laisse-t-il en place une défense de repos suffisante, le plus souvent 3 + 2 ?
3. **Sans ballon**, ferme-t-il l'axe et tient-il dans une trentaine de mètres de profondeur ?
4. **Entre les deux**, combien coûte la bascule : combien de joueurs doivent courir, et sur quelle distance, pour passer d'une forme à l'autre ?

> [!NJANGI] Trois photos, une équipe
> Un système se juge sur trois photos : avec le ballon, sans le ballon, et deux secondes après la perte.
> Si la troisième est mauvaise, les deux premières ne servent à rien.

La devise s'applique ici mot pour mot. Le ballon doit voyager, mais il doit savoir où il va : une structure, ce sont ses adresses. Cinq joueurs sur la ligne haute, un homme libre derrière la première ligne, une défense de repos derrière le ballon. Sans adresses, la caisse tourne en rond.

## Avec le ballon : les structures Njangi

Quatre structures couvrent presque tous les besoins d'une équipe Njangi. Elles naissent de trois systèmes de départ.

### Du 4-3-3 au 3-2-5 : la référence

C'est la structure décrite au chapitre 6. Un latéral reste bas et forme une ligne de trois avec les centraux relanceurs ; l'autre entre à côté du pivot. Devant, les ailiers de largeur tiennent les couloirs extérieurs, les intérieurs les demi-espaces, l'attaquant point d'appui l'axe. Elle est **asymétrique**, et c'est sa force : le latéral resté bas est déjà à sa place au moment de la perte, et le latéral intérieur est déjà au centre pour Reprendre.

On laisse bas le latéral du côté où l'adversaire garde son contre-attaquant le plus dangereux, et on fait rentrer celui qui sait le mieux jouer dos au jeu et défendre l'axe à la perte.

### Du 4-3-3 au 2-3-5 : deux façons de remplir la même photo

Le 2-3-5 se construit de deux manières. Dans le **2-3-5 intérieur**, les deux latéraux entrent à côté du pivot et les ailiers gardent la largeur : l'axe est très bien protégé à la perte, mais les deux centraux défendent seuls de grands espaces sur les côtés. Dans le **2-3-5 extérieur**, ce sont les latéraux qui donnent la largeur, très haut, pendant que les ailiers rentrent dans les demi-espaces et que les intérieurs descendent à côté du pivot.

```schema
{"view":"full",
"players":[
{"id":"gk","team":"gk","x":8,"y":34,"label":"1"},
{"id":"a4","team":"a","x":26,"y":22,"label":"4"},
{"id":"a5","team":"a","x":26,"y":46,"label":"5"},
{"id":"a10","team":"a","x":42,"y":23,"label":"10"},
{"id":"a6","team":"a","x":39,"y":34,"label":"6"},
{"id":"a8","team":"a","x":42,"y":45,"label":"8"},
{"id":"a3","team":"a","x":77,"y":5,"label":"3"},
{"id":"a11","team":"a","x":72,"y":19,"label":"11"},
{"id":"a9","team":"a","x":80,"y":34,"label":"9"},
{"id":"a7","team":"a","x":72,"y":49,"label":"7"},
{"id":"a2","team":"a","x":77,"y":63,"label":"2"},
{"id":"d1","team":"b","x":87,"y":14},
{"id":"d2","team":"b","x":88,"y":28},
{"id":"d3","team":"b","x":88,"y":40},
{"id":"d4","team":"b","x":87,"y":54}
],
"ball":"a6",
"arrows":[
{"from":[40,8],"to":"a3","kind":"run","n":1},
{"from":[40,60],"to":"a2","kind":"run","n":1},
{"from":[63,9],"to":"a11","kind":"run","n":2},
{"from":[63,59],"to":"a7","kind":"run","n":2}
],
"labels":[{"x":26,"y":66.5,"text":"ligne de 2"},{"x":41,"y":66.5,"text":"ligne de 3"},{"x":60,"y":66.5,"text":"ligne de 5"}]}
```

Dans ce 2-3-5 extérieur, les latéraux montent dans les couloirs extérieurs (1), les ailiers rentrent dans les demi-espaces (2), les intérieurs encadrent le pivot : cinq attaquants contre quatre défenseurs. Il convient aux latéraux endurants et aux ailiers qui aiment rentrer pour frapper, un gaucher à droite, un droitier à gauche. Son prix : à la perte, les deux latéraux sont à cinquante mètres de leur zone. C'est la bascule la plus chère, réservée aux équipes qui ont les jambes pour la payer.

### Du 4-2-3-1 au 3-1-6 dans le dernier tiers

Le 4-2-3-1 part avec deux milieux devant la défense, le pivot (6) et un intérieur (8), un meneur (10) derrière l'attaquant point d'appui et deux ailiers. Dans le dernier tiers, contre un bloc bas, il peut devenir un **3-1-6** : le latéral droit reste avec les centraux, le pivot reste seul devant eux, et six joueurs attaquent la dernière ligne adverse. Le latéral gauche monte dans le couloir extérieur, l'ailier gauche rentre dans le demi-espace, le 10 occupe l'autre demi-espace, l'ailier droit garde la largeur, et le 8 arrive en retard à l'entrée de la surface, derrière l'attaquant point d'appui.

```schema
{"view":"half",
"players":[
{"id":"a4","team":"a","x":4,"y":18,"label":"4"},
{"id":"a5","team":"a","x":3,"y":34,"label":"5"},
{"id":"a2","team":"a","x":4,"y":50,"label":"2"},
{"id":"a6","team":"a","x":15,"y":37,"label":"6"},
{"id":"a3","team":"a","x":40,"y":4,"label":"3"},
{"id":"a11","team":"a","x":41,"y":16,"label":"11"},
{"id":"a9","team":"a","x":45,"y":28,"label":"9"},
{"id":"a8","team":"a","x":36,"y":37,"label":"8"},
{"id":"a10","team":"a","x":41,"y":52,"label":"10"},
{"id":"a7","team":"a","x":40,"y":64,"label":"7"},
{"id":"f9","team":"b","x":11,"y":26},
{"id":"m1","team":"b","x":31,"y":12},
{"id":"m2","team":"b","x":31,"y":26},
{"id":"m3","team":"b","x":31,"y":44},
{"id":"m4","team":"b","x":31,"y":57},
{"id":"d1","team":"b","x":44.5,"y":9},
{"id":"d2","team":"b","x":44.5,"y":21},
{"id":"d3","team":"b","x":44.5,"y":34},
{"id":"d4","team":"b","x":44.5,"y":46},
{"id":"d5","team":"b","x":44.5,"y":58},
{"id":"gb","team":"gkb","x":51,"y":34}
],
"ball":"a6",
"arrows":[
{"from":[24,8],"to":"a3","kind":"run","n":1},
{"from":[22,46],"to":"a8","kind":"run","n":2}
],
"zones":[{"x":0,"y":12,"w":20,"h":44,"tone":"a","label":"3 + 1"}],
"labels":[{"x":24,"y":66.5,"text":"six contre cinq"}]}
```

Six attaquants contre cinq défenseurs : chacun est occupé, et il reste un homme libre. Mais la défense de repos n'est plus qu'un 3 + 1, qui exige un pivot qui lit le jeu avant tout le monde et des centraux rapides. Le Njangi réserve donc le 3-1-6 aux blocs très bas et aux fins de match où il faut marquer (chapitres 20 et 23).

### Le 3-4-3 : une structure déjà prête

Le 3-4-3 aligne trois centraux, deux milieux, deux **pistons** (des latéraux qui occupent seuls tout un couloir) et trois attaquants, dont deux dans les demi-espaces. Avec le ballon, il est déjà presque un 3-2-5 : les pistons montent, et c'est tout. Peu de rotations, donc peu de séances pour l'installer. En contrepartie, les centraux latéraux doivent savoir conduire, et les pistons font le travail de deux joueurs : la largeur avec le ballon, la ligne de cinq sans lui. Sous la chaleur, c'est le poste le plus exposé du terrain.

| Structure avec ballon | Système de départ | Qui donne la largeur | Défense de repos | Coût de la bascule |
|---|---|---|---|---|
| 3-2-5 asymétrique | 4-3-3 | les ailiers | 3 + 2 | faible |
| 2-3-5 intérieur | 4-3-3 | les ailiers | 2 + 3 | moyen |
| 2-3-5 extérieur | 4-3-3 | les latéraux | 2 + 3 | élevé |
| 3-1-6 | 4-2-3-1 | un latéral et un ailier | 3 + 1 | élevé |
| 3-2-5 du 3-4-3 | 3-4-3 | les pistons | 3 + 2 | faible, sauf pour les pistons |

## Occuper les couloirs et les hauteurs

Quelle que soit la structure, les règles d'occupation restent les mêmes. Sur la ligne la plus haute, un joueur par couloir. Derrière, les quatre hauteurs du chapitre 6 : devant la première ligne adverse (les relanceurs), entre la première et la deuxième (le pivot, le latéral intérieur), entre les lignes (les intérieurs) et dans la profondeur (l'attaquant et les appels des ailiers).

La règle la plus utile au quotidien est celle du **trio de côté**. De chaque côté, le latéral, l'intérieur et l'ailier forment un trio. Dans ce trio, un joueur donne la largeur, un joueur occupe le demi-espace, un joueur soutient derrière. Jamais deux dans le même couloir sur la même ligne, jamais les trois à la même hauteur. Le trio peut tourner, les rôles peuvent changer de propriétaire, mais les trois places restent occupées.

| Si l'ailier... | alors le latéral... | et l'intérieur... |
|---|---|---|
| reste collé à la ligne | rentre à côté du pivot ou reste bas | occupe le demi-espace, entre les lignes |
| rentre dans le demi-espace | monte dans le couloir extérieur | soutient derrière, ou attaque la profondeur |
| décroche pour recevoir | reste bas, en soutien | attaque l'espace laissé dans le dos |

```schema
{"view":"half",
"players":[
{"id":"a6","team":"a","x":8,"y":34,"label":"6"},
{"id":"a3","team":"a","x":13,"y":7,"label":"3"},
{"id":"a10","team":"a","x":27,"y":21,"label":"10"},
{"id":"a11","team":"a","x":37,"y":5,"label":"11"},
{"id":"a9","team":"a","x":44,"y":33,"label":"9"},
{"id":"rm","team":"b","x":21,"y":12},
{"id":"cm","team":"b","x":21,"y":29},
{"id":"rb","team":"b","x":42,"y":11},
{"id":"rcb","team":"b","x":44,"y":25}
],
"ball":"a6",
"arrows":[
{"from":"a11","to":[37,18],"kind":"run","n":1},
{"from":"a3","to":[29,5],"kind":"run","n":2},
{"from":"a10","to":[18,22],"kind":"run","n":3}
],
"labels":[{"x":29,"y":10,"text":"largeur"},{"x":37,"y":22.5,"text":"demi-espace"},{"x":17,"y":27,"text":"soutien"}]}
```

Ici, le trio gauche tourne sans laisser de trou : l'ailier rentre dans le demi-espace (1), le latéral prend la largeur qu'il a laissée (2), l'intérieur recule pour soutenir (3). Les trois places restent occupées, par d'autres joueurs, et le latéral adverse ne sait plus qui suivre.

Deux règles complètent le trio. Le pivot ne laisse jamais l'axe vide : s'il descend, quelqu'un prend sa place. Et quand l'attaquant point d'appui décroche, un intérieur ou un ailier attaque aussitôt la profondeur qu'il a laissée : « Quand tu viens, quelqu'un part. »

## Sans ballon : 4-4-2, 4-5-1, 5-4-1

Sans ballon, le Njangi utilise trois formes, choisies selon la sortie de balle adverse, la hauteur de bloc voulue (chapitre 8) et les jambes disponibles. Le pressing est détaillé au chapitre 21, le bloc au chapitre 22.

**Le 4-4-2 tiré du 4-3-3.** L'intérieur gauche monte à côté de l'attaquant point d'appui, les ailiers redescendent sur la ligne des milieux, le pivot et l'autre intérieur tiennent l'axe. Les deux attaquants s'occupent des centraux adverses, et l'un d'eux garde le pivot adverse dans son **ombre de couverture** : derrière lui, sur la ligne de passe qu'il coupe par sa seule position. C'est la forme de référence du bloc médian et du pressing.

```schema
{"view":"full",
"players":[
{"id":"gk","team":"gk","x":12,"y":34,"label":"1"},
{"id":"a3","team":"a","x":34,"y":11,"label":"3"},
{"id":"a4","team":"a","x":33,"y":26,"label":"4"},
{"id":"a5","team":"a","x":33,"y":42,"label":"5"},
{"id":"a2","team":"a","x":34,"y":57,"label":"2"},
{"id":"a11","team":"a","x":46,"y":12,"label":"11"},
{"id":"a6","team":"a","x":45,"y":28,"label":"6"},
{"id":"a8","team":"a","x":45,"y":41,"label":"8"},
{"id":"a7","team":"a","x":46,"y":56,"label":"7"},
{"id":"a10","team":"a","x":67,"y":29,"label":"10"},
{"id":"a9","team":"a","x":63,"y":45,"label":"9"},
{"id":"bc1","team":"b","x":77,"y":22},
{"id":"bc2","team":"b","x":77,"y":46},
{"id":"bp","team":"b","x":59,"y":34},
{"id":"gkb","team":"gkb","x":100,"y":34}
],
"ball":"bc1",
"arrows":[
{"from":[60,8],"to":"a11","kind":"run","n":1},
{"from":[60,60],"to":"a7","kind":"run","n":1},
{"from":[52,18],"to":"a10","kind":"run","n":2},
{"from":"a10","to":"bc1","kind":"press","n":3}
],
"labels":[{"x":59,"y":39.5,"text":"dans l'ombre"},{"x":40,"y":66,"text":"4-4-2"}]}
```

Les ailiers redescendent (1), l'intérieur gauche monte (2), puis presse le central adverse en arrivant de l'intérieur (3) : son corps coupe la passe vers le pivot, resté dans son ombre.

**Le 4-5-1 (ou 4-1-4-1).** Les ailiers et les intérieurs forment une ligne de quatre, le pivot reste derrière comme écran, l'attaquant point d'appui reste seul devant. C'est la forme qui ferme le mieux l'espace entre les lignes, contre trois milieux centraux mobiles ou quand la chaleur interdit de presser haut. Sa faiblesse : l'attaquant est seul. Pour Regarder devant, les ailiers partent dès que le ballon est repris.

**Le 5-4-1.** Il naît du 3-4-3 quand les pistons redescendent, ou d'un 4-3-3 quand un ailier se replace en cinquième défenseur, du côté de l'ailier adverse le plus dangereux. Il protège toute la largeur de la surface. C'est la forme du bloc bas et des fins de match à protéger, à condition de garder un plan pour ressortir : un attaquant qui garde le ballon dos au but, et deux joueurs prêts à sprinter vers lui.

| Leur sortie de balle | Notre forme sans ballon | L'idée |
|---|---|---|
| Deux centraux et un pivot | 4-4-2 | deux contre deux sur les centraux, le pivot dans l'ombre |
| Trois relanceurs | 4-4-2 avec un ailier qui saute, ou 4-3-3 | égalité sur la première ligne |
| Trois milieux centraux mobiles | 4-5-1 | fermer l'axe et l'espace entre les lignes |
| Ailiers très larges et beaucoup de centres | 5-4-1 en bloc bas, en fin de match | défendre la largeur de la surface |

## Le coût de la bascule

Revenons à la troisième photo du vestiaire de Yaoundé. Le trou de quarante mètres ne venait pas d'un mauvais système, mais d'une bascule trop chère : l'équipe avait monté ses deux latéraux et ses deux intérieurs en même temps, et à la perte, quatre joueurs avaient chacun quarante mètres à courir.

Le Njangi mesure ce coût à la vidéo : pour chaque joueur, la distance entre sa place avec ballon et sa place sans ballon. Trois règles en découlent. De chaque côté, pas plus d'un joueur qui doit traverser la moitié du terrain pour se replacer. Les plus longues bascules reviennent à ceux qui ont les jambes pour les faire, et le staff les surveille en seconde période. Et quand la bascule est trop chère pour l'effectif du jour, on ne demande pas de courir plus : on change de structure. Le 3-2-5 asymétrique est la plus économique, d'où son statut de référence.

> [!AFRIQUE] Peu de jours, des clubs différents
> Une sélection se réunit environ 9 à 10 jours par fenêtre, avec des joueurs venus de clubs et de systèmes différents. Une base et une variante suffisent, chacune nommée par un mot que tout le groupe comprend.
> Sous la chaleur de l'après-midi, la bascule se paie double : une structure économique garde des jambes pour la fin du match.
> Pour un joueur de la diaspora ou appelé pour la première fois, une fiche de rôle d'une page avec les trois photos de son poste vaut mieux qu'un long discours.

## Quel système pour quel effectif

### Selon l'âge

Les formats des jeunes varient selon les fédérations : adaptez le tableau aux vôtres.

| Âge | Format courant | Structure conseillée | Ce que l'enfant apprend |
|---|---|---|---|
| U6 à U9 | 3 contre 3 à 5 contre 5 | aucune, seulement « écarte-toi » | la largeur, le soutien, jouer ensemble |
| U10 et U11 | 7 contre 7 | gardien + 2-3-1 ou 3-2-1 | trois hauteurs, le triangle, le losange |
| U12 et U13 | 8 contre 8 ou 9 contre 9 | gardien + 3-3-1 ou 3-2-3 | la ligne de relance, le pivot, la largeur |
| U14 à U16 | 11 contre 11 | 4-3-3 qui devient 3-2-5, 4-4-2 sans ballon | les rôles, le trio de côté, la défense de repos |
| U17 à U19 | 11 contre 11 | le 3-2-5 et une variante, 4-4-2 et 4-5-1 sans ballon | changer de structure pendant le match |
| Seniors | 11 contre 11 | une base et une variante, selon l'effectif | le plan de match |

Le 3-2-3 du 9 contre 9 est déjà le 3-2-5 sans ses couloirs extérieurs : l'enfant qui y a joué à 12 ans retrouve à 15 ans une carte qu'il connaît.

> [!JEUNES] Pas de système avant 12 ans
> Avant 12 ans, on ne récite pas de système. On apprend à s'écarter, à se montrer, à occuper la largeur, et chacun joue à tous les postes, gardien compris.
> Entre 12 et 16 ans, une seule structure avec ballon et une seule sans ballon. Séances courtes quand il fait chaud, eau à volonté, et jamais de reproche crié à un enfant qui s'est trompé de place : on l'aide à la retrouver.

### Selon les joueurs

Le système suit les joueurs, jamais l'inverse. Deux ailiers forts en un contre un et un pivot qui lit le jeu : 3-2-5 asymétrique, pour isoler les ailiers. Des latéraux endurants et des ailiers qui aiment rentrer : 2-3-5 extérieur. Un meneur créatif mais pas de vrai pivot : 4-2-3-1, le 3-1-6 en réserve. Trois centraux à l'aise avec le ballon et deux pistons infatigables : 3-4-3. Beaucoup de nouveaux joueurs : la structure qui demande le moins de rotations. L'erreur la plus répandue est de copier le système d'un grand club vu à la télévision sans avoir ses profils : on obtient la forme sans le fond.

## Problèmes fréquents et solutions

| Problème | Ce qu'on voit | Solution |
|---|---|---|
| La structure de la feuille reste figée | quatre défenseurs alignés en possession, personne entre les lignes | nommer la structure avec ballon, la répéter sans opposition, puis en [[F02]] |
| Le trio de côté s'empile | latéral et ailier dans le même couloir | la règle du trio, couloirs tracés à la coupelle en [[P02]] |
| Les deux latéraux montent ensemble | défense de repos à deux contre trois | annoncer avant le match qui reste bas ; [[F06]] |
| La bascule est trop lente | un trou au milieu après la perte | structure asymétrique, et [[T06]] pour relier attaque et repli |
| Un nouveau système à chaque match | joueurs perdus, mots différents | une base et une variante pour toute la saison |

## À l'entraînement

Une structure s'installe en trois temps. D'abord **sans opposition** : [[G06]] fait dérouler l'équipe à 11, du gardien au tir, à allure de marche, chaque joueur nommant son intention. Ensuite **en jeu de position** : [[P02]] pour la règle des couloirs, [[F02]] pour la sortie en 3-2, [[L01]] et [[L05]] pour la largeur, [[C13]] pour faire tourner le trio de côté. Enfin **en match à thème** : [[L04]] avec la règle de la photo. L'entraîneur crie « Photo », tout le monde s'arrête, chacun vérifie son couloir, sa hauteur et la défense de repos, puis le jeu reprend. Deux ou trois photos par série suffisent ; au-delà, le jeu meurt. Sans ballon, [[T04]] installe le 4-4-2 du bloc médian ; la bascule se travaille en [[T06]] et [[F06]]. Les consignes tiennent en peu de mots : « Ta place avec, ta place sans », « Trio : largeur, demi-espace, soutien ».

> [!ANALYSTE] Mesurer la structure
> Toutes les cinq minutes, l'analyste fige l'image une fois avec le ballon et une fois sans, et note la structure réelle (par exemple 3-2-5 ou 4-4-2), le nombre de couloirs occupés sur la ligne haute et les infractions au trio de côté.
> Après chaque perte, il note si la défense de repos était en place et combien de secondes il a fallu pour que la ligne des milieux et la ligne des défenseurs soient de nouveau compactes. Ce repère interne se suit match après match et éclaire le sous-indice Reprise de l'Indice Njangi (chapitre 32).

Un système ne joue pas à la place des joueurs. Il leur donne des adresses, une pour chaque moment, et un chemin pour aller de l'une à l'autre. Une équipe Njangi peut changer de chiffres trois fois dans le même match sans jamais changer d'idée : avec le ballon, cinq qui attaquent et cinq qui protègent ; sans le ballon, un bloc qui ferme l'axe ; entre les deux, une bascule assez courte pour que la troisième photo ressemble enfin à une équipe.
