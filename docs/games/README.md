# Ndamba games

Two games built from William Foteping's books, inside the Ndamba site at `/jeux`, free to play,
no account needed.

| | LE CODE NJANGI : l'art de posséder | LIONCEAUX : le ballon qui voyage |
|---|---|---|
| Kind | tactical trainer | cinematic story adventure |
| Book | Le Code Njangi. Posséder avec intention (`coach/`) | Lionceaux, tome 1 : Le Ballon qui voyage (`tome1/`) |
| Route | `/jeux/code-njangi` | `/jeux/lionceaux` |
| Code | `app/src/games/njangi/` | `app/src/games/lionceaux/` |

Documents:

- `ARCHITECTURE.md`: the shared engine (simulation, rendering, people, input, sound) and the story
  engine of Lionceaux (scripts, challenges, sets, QA tooling).
- `code-njangi-architecture.md`: how Le Code Njangi is organised.
- `SOURCE-MAP-LIONCEAUX.md`: every beat of every scripted chapter, what the player does, how many of
  the book's lines it shows (generated: `node tools/lionceaux-source-map.mjs`).
- `SOURCE-MAP-CODE-NJANGI.md`: which part of the coaching book each mode of Le Code Njangi uses.
- `ART-BIBLE.md`: people, places, light, camera, interface, sound, quality tiers, sources and licences.
- `PROGRESS.md`: what is done, what is checked and how, what is left, known issues.

Commands (from `app/`):

```
npx tsc --noEmit -p tsconfig.app.json    # types
npx vitest run                            # unit tests, including the verbatim check of every subtitle
npx vite build                            # production build
node ../tools/lionceaux-source-map.mjs    # refresh the Lionceaux source map
python3 tools/humans/build.py <arch>      # rebuild a figure (needs Blender's bpy and the MPFB2 data)
```

Story QA in a browser: `/jeux/lionceaux/chapitre/8?e2e&qa` plays chapter 8 by itself (add
`&scene=12` to start at beat 12, `&hold=Kaydoudou pose` to stop on a line, `&catchup=4` on a slow
software renderer).
