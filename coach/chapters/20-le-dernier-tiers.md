---
numero: 20
slug: le-dernier-tiers
titre: Le dernier tiers : attaquer la surface
partie: 4
titrePartie: La tactique Njangi
resume: Les zones du dernier tiers, les courses dans le demi-espace, la zone de retrait et le centre en retrait, la règle des cinq pour occuper la surface, les types de centres, l'attaque d'un bloc bas, et la défense de repos qui protège l'équipe pendant qu'elle attaque.
---

Un match U23 contre un bloc bas, à Douala. À la mi-temps, l'analyste a compté quatorze centres. Douze aériens, frappés de loin, vers une surface où attendaient deux de nos joueurs, à l'arrêt, au milieu de quatre défenseurs plus grands qu'eux. Aucun tir cadré.

En seconde période, l'entraîneur ne change aucun joueur. Il change une règle : « Ligne de fond, puis en retrait. » À la 58e minute, l'intérieur droit attaque le couloir entre le latéral et le central adverses, arrive près de la ligne de but et donne au sol, en retrait, vers l'attaquant point d'appui lancé au point de penalty. Un but simple, peut-être le plus simple du football.

Le dernier tiers est l'endroit où la possession se transforme en occasions, ou meurt. Ce chapitre traite de l'intention **Finir** du chapitre 5 : comment entrer dans la surface, comment l'occuper, et comment attaquer sans s'exposer.

## Les zones du dernier tiers

Pour parler du dernier tiers avec précision, le Njangi y nomme cinq zones, toutes repérables grâce aux lignes de la surface.

- La **zone de finition**, déjà définie au chapitre 5 : le cœur de la surface, de la largeur de la surface de but, de la ligne de but jusqu'un peu au-delà du point de penalty. C'est là que l'on veut tirer.
- Les deux **zones de retrait** : dans la surface, entre le côté de la surface de but et le côté de la surface de réparation, près de la ligne de but. C'est de là que part le centre en retrait.
- Les deux **portes** : à l'entrée de la surface, dans les demi-espaces. C'est par elles qu'on entre dans la surface en conduite, par un une-deux ou par un appel.
- La **lisière** : devant la surface, dans l'axe. C'est la zone du second ballon, de la frappe et de la première contre-pression.

```schema
{"view":"third",
"players":[
{"id":"a8","team":"a","x":14,"y":48,"label":"8"},
{"id":"a10","team":"a","x":13,"y":31,"label":"10"},
{"id":"a9","team":"a","x":21,"y":40,"label":"9"},
{"id":"b1","team":"b","x":22,"y":52},
{"id":"b2","team":"b","x":28.5,"y":41},
{"id":"b3","team":"b","x":27,"y":29},
{"id":"gkb","team":"gkb","x":33.5,"y":36}
],
"ball":"a8",
"arrows":[
{"from":"a8","to":[31,49],"kind":"dribble","n":1},
{"from":"a9","to":[31,38],"kind":"run","n":2},
{"from":"a10","to":[22,36],"kind":"run","n":2},
{"from":[31,49],"to":[22,36],"kind":"pass","n":2},
{"from":[22,36],"to":[35,31.5],"kind":"shot","n":3}
],
"zones":[
{"x":22,"y":24.84,"w":13,"h":18.32,"tone":"a","label":"finition"},
{"x":29.5,"y":13.84,"w":5.5,"h":11,"tone":"n","label":"retrait"},
{"x":29.5,"y":43.16,"w":5.5,"h":11,"tone":"n","label":"retrait"},
{"x":12,"y":13.84,"w":6.5,"h":11,"tone":"soft","label":"porte"},
{"x":12,"y":43.16,"w":6.5,"h":11,"tone":"soft","label":"porte"},
{"x":12,"y":24.84,"w":6.5,"h":18.32,"tone":"soft","label":"lisière"}
]}
```

L'intérieur (8) entre par la porte du demi-espace et conduit jusqu'à la zone de retrait (1). L'attaquant point d'appui (9) attaque le premier poteau et emmène un central ; l'autre intérieur (10) arrive lancé et reçoit le centre en retrait (2) dans la zone de finition, face au but, pour frapper en une touche (3).

## Les courses dans le demi-espace

La course la plus dangereuse du dernier tiers est celle qui attaque le **couloir** entre le latéral et le central adverses, dans le demi-espace. Le défenseur qui la voit doit choisir : le latéral la suit et abandonne l'ailier, le central la suit et abandonne l'axe. Le Njangi l'utilise de deux façons.

Le **dédoublement intérieur** : l'ailier reçoit large, le latéral adverse sort sur lui, et l'intérieur part dans le couloir que cette sortie vient d'ouvrir. C'est la course reine du Njangi, parce qu'elle mène droit à la zone de retrait. Le **dédoublement extérieur** : le latéral passe par l'extérieur de l'ailier, qui rentre alors dans le demi-espace avec le ballon. Il sert quand le latéral adverse reste à l'intérieur pour fermer le couloir.

```schema
{"view":"half",
"players":[
{"id":"a7","team":"a","x":34,"y":62,"label":"7"},
{"id":"a8","team":"a","x":26,"y":50,"label":"8"},
{"id":"a10","team":"a","x":30,"y":30,"label":"10"},
{"id":"a9","team":"a","x":46,"y":39,"label":"9"},
{"id":"a2","team":"a","x":20,"y":61,"label":"2"},
{"id":"a6","team":"a","x":12,"y":40,"label":"6"},
{"id":"lb","team":"b","x":36,"y":56.5},
{"id":"lm","team":"b","x":28,"y":57},
{"id":"lcb","team":"b","x":48.5,"y":43},
{"id":"rcb","team":"b","x":45,"y":28},
{"id":"rb","team":"b","x":42,"y":16},
{"id":"gb","team":"gkb","x":51,"y":37}
],
"ball":"a7",
"arrows":[
{"from":"lb","to":"a7","kind":"press","n":1},
{"from":"a8","to":[47,52],"kind":"run","n":1},
{"from":"a7","to":[46,53],"kind":"pass","n":1},
{"from":"a10","to":[39,35],"kind":"run","n":2},
{"from":[47.5,52.5],"to":[39,35],"kind":"pass","n":2},
{"from":[39,35],"to":[52.5,30.5],"kind":"shot","n":3}
]}
```

Le latéral adverse sort sur l'ailier (7) ; l'intérieur (8) part aussitôt dans le couloir qu'il vient de quitter, et l'ailier joue dans sa course (1). L'intérieur arrive près de la ligne de but et donne en retrait (2) à l'autre intérieur (10), arrivé lancé à hauteur du point de penalty, qui frappe au second poteau (3). L'attaquant (9) a fixé le central près du premier poteau.

Une course dans le couloir a ses règles. Le coureur part de l'angle mort du défenseur, dans son dos ou à sa hauteur, jamais devant ses yeux. Il part quand l'ailier reçoit, pas avant (il serait hors-jeu ou attendu), pas après (le couloir se serait refermé). Il court en courbe pour rester en jeu, puis droit vers la ligne de but. Et il regarde avant de recevoir : le centre en retrait se décide avant le contrôle.

## La zone de retrait et le centre en retrait

Pourquoi le centre en retrait est-il la passe préférée du Njangi ? Parce qu'il retourne la situation des défenseurs. Au moment où le ballon arrive près de la ligne de but, les défenseurs courent vers leur propre but et regardent le ballon, dos au jeu qui arrive. L'attaquant qui reçoit en retrait, lui, arrive face au but, lancé, avec le gardien déjà décalé vers le premier poteau. Le tir part de la zone de finition, en une touche.

Le geste est précis. Le centreur lève la tête avant le dernier contact. Il donne au sol, tendu mais pas violent, devant le point de penalty, dans la course du partenaire, jamais dans ses pieds arrêtés. Le receveur frappe en une touche, avec le plat ou le cou-de-pied, en cherchant le cadre plus que la puissance. Les consignes : « Ligne de fond, tête levée, au sol », et pour le receveur : « Arrive, ne t'arrête pas ».

## Occuper la surface : la règle des cinq

Un bon centre vers une surface mal occupée ne vaut rien. Le Njangi donne à ses joueurs une règle simple, que tout le monde peut vérifier sur une image.

> [!NJANGI] La règle des cinq
> Quand le ballon arrive dans le dernier tiers sur un côté, cinq joueurs attaquent : le porteur, trois joueurs dans la surface à trois hauteurs différentes (premier poteau, point de penalty, second poteau) et un joueur à la lisière.
> Derrière eux, cinq joueurs protègent. Cinq qui attaquent, cinq qui protègent : la caisse est jouée, mais elle n'est jamais abandonnée.

Trois comportements font vivre la règle. **Arriver, pas attendre** : les joueurs de la surface partent quand le porteur lève la tête, pas avant ; un attaquant arrêté dans la surface est un attaquant marqué. **Croiser les courses** : le joueur du premier poteau et celui du point de penalty croisent leurs trajectoires, ce qui oblige leurs défenseurs à se passer le marquage au pire moment. **Attaquer l'espace, pas le joueur** : chacun court vers une zone, pas vers un défenseur.

```schema
{"view":"half",
"players":[
{"id":"a7","team":"a","x":44,"y":61,"label":"7"},
{"id":"a9","team":"a","x":40,"y":43,"label":"9"},
{"id":"a10","team":"a","x":34,"y":30,"label":"10"},
{"id":"a11","team":"a","x":38,"y":15,"label":"11"},
{"id":"a8","team":"a","x":30,"y":48,"label":"8"},
{"id":"lb","team":"b","x":43,"y":55},
{"id":"lcb","team":"b","x":45,"y":44},
{"id":"rcb","team":"b","x":45.5,"y":33},
{"id":"rb","team":"b","x":40,"y":24},
{"id":"dm","team":"b","x":37,"y":38},
{"id":"gb","team":"gkb","x":51,"y":37}
],
"ball":"a7",
"arrows":[
{"from":"a9","to":[47.5,39.5],"kind":"run","n":1},
{"from":"a10","to":[41.5,34],"kind":"run","n":1},
{"from":"a11","to":[47,27],"kind":"run","n":1},
{"from":"a8","to":[35,45],"kind":"run","n":1}
],
"zones":[{"x":39.5,"y":24.84,"w":13,"h":18.32,"tone":"a"}],
"labels":[{"x":46.5,"y":48,"text":"premier poteau"},{"x":38,"y":27.5,"text":"penalty"},{"x":47.5,"y":15,"text":"second poteau"},{"x":33,"y":51.5,"text":"lisière"}]}
```

L'ailier droit (7) va centrer. L'attaquant (9) attaque le premier poteau, l'intérieur gauche (10) le point de penalty, l'ailier opposé (11) le second poteau, en dernier, et l'intérieur droit (8) reste à la lisière pour le retrait et le second ballon. Les cinq autres joueurs, hors du schéma, forment la défense de repos.

Le rôle de l'ailier opposé mérite une précision. Il est le joueur le plus souvent oublié par les défenseurs, qui regardent le ballon de l'autre côté. Il doit arriver au second poteau en dernier, au moment du centre ; s'il rentre trop tôt dans l'axe, il devient un défenseur de plus à éviter pour notre propre centre.

## Les types de centres

Le centre en retrait n'est pas le seul centre utile. Chacun a sa zone de départ, sa cible et son moment.

| Centre | D'où | Vers où | Quand |
|---|---|---|---|
| En retrait, au sol | zone de retrait, près de la ligne de but | point de penalty, lisière | après une entrée par le demi-espace ; le premier choix |
| Tendu au premier poteau | couloir extérieur, à hauteur de la surface | entre le gardien et les défenseurs | la défense recule vers son but ; on dévie en une touche |
| Rentrant | demi-espace, pied opposé au côté | dans le dos de la défense, loin du gardien | la défense est haute et nos joueurs courent vers le but |
| Précoce | couloir extérieur, avant le dernier tiers | dans le dos de la dernière ligne | en transition, avant que la défense soit en place |
| En hauteur au second poteau | couloir extérieur ou ligne de fond | second poteau | un duel aérien clairement favorable |

Le centre aérien de loin vers une surface regroupée est presque toujours le plus mauvais choix : les défenseurs le voient venir, face au ballon, et sont souvent plus nombreux. On ne l'interdit pas ; on le réserve aux situations où l'on a gagné le duel avant même de centrer.

## Attaquer un bloc bas

Contre une équipe regroupée devant sa surface, avec dix joueurs dans ses trente derniers mètres, le dernier tiers devient un travail de patience. Le Njangi y applique cinq principes.

**Fixer la dernière ligne.** Cinq ou six joueurs occupent la dernière ligne adverse, un par couloir (chapitre 17, le 3-1-6). Chaque défenseur a quelqu'un à surveiller ; aucun ne peut sortir sans ouvrir une porte.

**Déplacer le bloc vite.** La circulation d'un côté à l'autre doit aller plus vite que le glissement adverse. Une passe lente laisse le bloc se replacer ; deux passes tendues l'obligent à courir.

**Attirer hors de la ligne.** Un défenseur qui sort de sa ligne pour presser un joueur entre les lignes ouvre un trou derrière lui. Le dribble njangi dans une porte, qui attire deux adversaires avant de donner, et le une-deux à la lisière sont les outils de cette ouverture.

**Respirer sans s'endormir.** Contre un bloc bas, on garde le ballon longtemps : c'est Respirer et Fixer en même temps. Mais la circulation garde un but : chaque passe prépare une entrée par une porte ou un renversement vers l'ailier isolé.

**Frapper parfois.** Une équipe qui ne frappe jamais de loin laisse le bloc reculer jusque dans sa surface. Une frappe cadrée de la lisière, avec un joueur qui suit pour le rebond, oblige les milieux adverses à sortir. Elle reste une exception, jamais un réflexe.

> [!AFRIQUE] Contre ceux qui nous attendent
> Les grandes nations africaines affrontent souvent, en qualifications comme en phase finale, des adversaires qui défendent bas et attendent la contre-attaque. Le dernier tiers est alors la partie du match qui décide de tout, et celle qui se prépare le mieux à la vidéo.
> Sur un terrain bosselé, le centre en retrait rebondit : on le donne tendu, et le receveur frappe du plat du pied, en plaçant. Sous la chaleur, une longue possession devant un bloc bas fait courir l'adversaire pendant que nos joueurs marchent.

## La défense de repos pendant l'attaque

Cinq joueurs attaquent la surface, cinq protègent : c'est la seconde moitié de la règle des cinq. La **défense de repos** se place pendant que l'attaque se construit, pas après la perte. Elle suit trois règles. **Le nombre** : sur la dernière ligne, autant de joueurs que d'attaquants adverses restés haut, plus un (chapitre 7). **La hauteur** : quand le ballon est dans la surface adverse, la dernière ligne se tient près de la ligne médiane ou au-delà, pour que l'espace entre elle et le ballon reste court. **La lisière** : le joueur de la lisière est le premier contre-presseur, et le pivot coupe la première passe adverse vers l'avant.

```schema
{"view":"full",
"players":[
{"id":"a4","team":"a","x":50,"y":24,"label":"4"},
{"id":"a5","team":"a","x":49,"y":43,"label":"5"},
{"id":"a2","team":"a","x":52,"y":57,"label":"2"},
{"id":"a3","team":"a","x":65,"y":20,"label":"3"},
{"id":"a6","team":"a","x":66,"y":38,"label":"6"},
{"id":"a8","team":"a","x":82,"y":45,"label":"8"},
{"id":"a10","team":"a","x":85,"y":21,"label":"10"},
{"id":"a9","team":"a","x":96,"y":36,"label":"9"},
{"id":"a11","team":"a","x":95,"y":22,"label":"11"},
{"id":"a7","team":"a","x":98,"y":58,"label":"7"},
{"id":"om","team":"b","x":77,"y":35},
{"id":"f1","team":"b","x":62,"y":27},
{"id":"f2","team":"b","x":61,"y":46},
{"id":"d1","team":"b","x":98,"y":30},
{"id":"d2","team":"b","x":97,"y":43},
{"id":"d3","team":"b","x":93,"y":17},
{"id":"gkb","team":"gkb","x":102,"y":34}
],
"ball":"om",
"arrows":[
{"from":"a8","to":"om","kind":"press","n":1},
{"from":"a10","to":"om","kind":"press","n":1},
{"from":"a6","to":[71,35],"kind":"run","n":2},
{"from":"a4","to":[57,25],"kind":"run","n":2},
{"from":"a5","to":[56,44],"kind":"run","n":2}
],
"zones":[
{"x":48,"y":14,"w":24,"h":48,"tone":"a","label":"défense de repos"},
{"x":73,"y":25,"w":14,"h":21,"tone":"b","label":"5 secondes"}
]}
```

Notre centre a été repoussé de la tête vers la lisière, où un milieu adverse contrôle. L'intérieur (8), placé à la lisière, et l'intérieur gauche (10) le pressent aussitôt (1). Le pivot (6) ferme la passe vers l'avant, et les centraux montent en restant entre les deux attaquants adverses et notre but (2). Le ballon repoussé n'est pas une fin d'attaque : c'est le début des 5 secondes de Reprendre.

## Problèmes fréquents et solutions

| Problème | Solution |
|---|---|
| Des centres aériens vers une surface vide ou trop grande | la règle des cinq, et le centre en retrait en premier choix |
| Des attaquants arrivés trop tôt, à l'arrêt | « Arrive, n'attends pas » : partir quand le centreur lève la tête |
| Tout le monde dans la surface, personne à la lisière | le cinquième reste à la lisière, pour le retrait et le second ballon |
| Le tir de loin réflexe | la passe de plus, sauf si la lisière est libre et qu'un partenaire suit |
| Le dédoublement qui arrive trop tard | partir quand l'ailier reçoit, pas quand il est déjà pressé |
| L'ailier opposé rentre trop tôt | il attaque le second poteau en dernier |
| L'attaque sans protection | aucun centre sans défense de repos en place |

> [!JEUNES] Finir à hauteur d'enfant
> Chez les jeunes, on préfère les centres au sol et en retrait, et l'on apprend à arriver dans la surface plutôt qu'à y attendre. Les répétitions de jeu de tête se limitent selon les recommandations de votre fédération.
> On félicite autant la passe qui a servi le tir que le but lui-même. Pauses d'eau, séances courtes par forte chaleur, et jamais de moquerie pour un tir manqué : le prochain partira.

## À l'entraînement

Le centre en retrait s'automatise d'abord en circuit, avec [[G01]], des deux côtés, puis sous opposition en [[F03]], où le ballon doit entrer par le demi-espace. [[F05]] met l'équipe face à un bloc bas de sept joueurs et récompense les entrées par les portes et les centres en retrait. [[G05]] apprend à frapper vite dans la surface, en une ou deux touches. [[G02]] et [[C10]] entraînent le une-deux à la lisière, [[G04]] l'isolement de l'ailier avant l'attaque de la surface. Pour la défense de repos pendant l'attaque, [[F06]] ne valide un but que si les 3 + 2 étaient en place, et [[T06]] enchaîne aussitôt la défense de la contre-attaque. [[L06]], enfin, apprend à rester longtemps dans le dernier tiers adverse sans perdre la tête.

> [!ANALYSTE] Mesurer le dernier tiers
> Les codes FINAL3 et BOX alimentent le sous-indice Pénétration (chapitre 32). L'analyste y ajoute la part des tirs pris dans la zone de finition, les centres en retrait réussis, et le nombre de joueurs dans la surface au moment de chaque centre.
> Il compte aussi, après chaque attaque placée perdue, si la défense de repos était en place et si le ballon a été repris dans les 5 secondes. Une équipe qui entre souvent dans la surface mais subit des contre-attaques n'a pas encore trouvé son équilibre.

Le but de la 58e minute, à Douala, n'avait rien d'un exploit. Une course dans le couloir, une tête levée, une passe au sol vers un joueur qui arrivait. Le ballon doit voyager, mais il doit savoir où il va : ce jour-là, il est allé de la porte du demi-espace à la zone de retrait, puis de la zone de retrait au point de penalty, et à chaque étape quelqu'un l'attendait.
