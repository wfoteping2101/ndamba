# Handoff: tome1-part5 (previous agent a50f08c15ad1847e2, stopped by an interruption)

## Original brief

You are a gifted French children's novelist. You are writing PART V (chapters 33 to 40, England, and the finale of the book) of "Kaydoudou & BriBri, Tome 1 : Le Ballon qui voyage", a French middle-grade (8 to 12 years old) football adventure novel. It is a gift from a Cameroonian father to his two sons, nicknamed Kaydoudou and BriBri, so it must be genuinely moving, funny, vivid and of publishable quality, as good as the best French "roman jeunesse". The last chapters must make a child cheer and a parent cry.

Working directory: /home/claude/njangi/tome1

1. First read these files completely and carefully: BIBLE.md (characters, world, rules), STYLE.md (writing rules, chapter file format, the "carnet" lesson box, the `schema` diagram JSON format), OUTLINE.md (the detailed plan of all 40 chapters; read all of it, because Part V pays off everything planted before, then focus on PART V, chapters 33 to 40).
2. Write chapters 33 to 40, one file each: chapters/33-<slug>.md ... chapters/40-<slug>.md, exactly in the format given in STYLE.md (front matter with numero, slug, titre, partie, pov, resume, illustration; story text; the `> [!CARNET] Leçon du Ballon n°N : ...` box; the ```schema block). Follow the OUTLINE beats in order; you may invent dialogue, scenes, minor characters and details, but do not change events, what characters learn, or their state at the end of each chapter: four other writers are writing Parts I to IV at the same time and rely on the OUTLINE. Recall the earlier payoffs to echo: Tonton Fokou's "Le ballon doit voyager" and the notebook covered in pagne; Mami Nyanga's njangi and patched ball signed by friends in every country (Ousmane, Mireille, Tonton Fokou; Tyler, Diego; Kenzo, Lucas, Awa, Lacombe; Avi Ramon, Laia, Nil, Youssef); the brothers' ritual (fist to fist, hand on heart) and juggling Mami's ball before big matches; BriBri's red and yellow socks; the "une-deux du Njangi"; Roger Milla's corner-flag dance; "2030 ou 2034. Et c'est nous." written in the notebook in Maryland; the five pieces (le cœur, la raison, les yeux, la carte, le souffle).
3. Hard rules (from STYLE.md, repeated because they matter): no em dash or en dash characters anywhere (dialogue uses « » guillemets with incises, one paragraph per reply); past tense narration (passé simple and imparfait), third person, point of view of the character named in the OUTLINE (chapter 40 switches to Kaydoudou after a * * * line); 1 650 to 1 950 words of story per chapter (not counting the carnet; chapter 40 may go up to 2 100); no real players or coaches named except Roger Milla; clubs are fictional (Kingsbridge Albion FC, TSV Rheinhafen, FC Amstelland); no brand names; no emojis. Short English phrases are welcome, translated or clear from context.
4. Make every chapter a real story scene with a hook, humour (BriBri and Freddie's jokes, "Most Upright Player", the red buses, Mami finding London "mouillée mais polie"), emotion, vivid sensory London (fine endless rain, the narrow house in Lewisham, cold March snow at the semi-final), clear football action, and an ending that makes the reader turn the page. Chapter 40's "but du Njangi" must be the most thrilling sequence of the book, readable and visual: the ball passes through all eleven Kingsbridge players, each step echoing a lesson of the book.
5. Check your work from /home/claude/njangi/tome1: `node ../tools/check.mjs chapters/3[3-9]-*.md chapters/40-*.md` must print `ok` for all 8. Render your schemas with `node ../tools/check.mjs --render /tmp/schemas-p5 chapters/3[3-9]-*.md chapters/40-*.md`, convert two or three (including chapter 40's) with `node ../tools/svg2png.mjs /tmp/schemas-p5/<file>.svg` and look at the PNGs with the Read tool; fix any cluttered or unclear diagram.
6. Write a short continuity file notes/part5.md (create the folder if needed) listing details you invented.
7. Do not edit any other file. Do not stop to ask questions; make good choices.

Final report (under 200 words): the 8 files with their word counts, and the key invented details.

## Files the previous agent wrote or edited

/home/claude/njangi/tome1/chapters/33-intensity-is-a-choice.md
/home/claude/njangi/tome1/chapters/34-jouer-avant-le-contact.md
/home/claude/njangi/tome1/chapters/35-le-pressing.md
/home/claude/njangi/tome1/chapters/36-le-njangi-du-vestiaire.md
/home/claude/njangi/tome1/chapters/37-monsieur-ateba.md
/home/claude/njangi/tome1/chapters/38-le-souffle.md

## Its last progress notes (oldest first)

- You've hit your session limit · resets 1:50am (America/New_York)

- I've read all three files. Writing the eight chapters now.

- The checker counts elided words as one, so chapters 34 and 35 come out short. I'll add a scene to each.

- Chapter 35 passes but is under the 1,650 target, so I'll add a short beat.

- Chapters 36 and 37 pass but are under 1,650. I'll add a small scene to each.

- You've hit your weekly limit · resets Oct 29, 6pm (America/New_York)

- Parts I to IV are now on disk, so I'll check their continuity notes before writing 39 and 40.
