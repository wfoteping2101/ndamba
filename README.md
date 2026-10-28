# Ndamba · Lionceaux · Le Code Njangi

**Posséder avec intention.** Une nation africaine championne du monde en 2030 ou en 2034.

One codebase, four products, by William Foteping (Lemon Network Solutions):

| Product | Where | What |
|---|---|---|
| **Lionceaux, tome 1 : Le Ballon qui voyage** (starring Kaydoudou & BriBri) | `tome1/` | French illustrated novel for ages 8 to 12, cinematic painted art (`tome1/art/`) (40 chapters, 5 parts: Cameroun, États-Unis, France, Espagne, Angleterre), each chapter ending with a « Leçon du Ballon ». Read at `/book/tome1/`, PDF in `app/public/downloads/`. |
| **Le Code Njangi** | `coach/` | French coaching book for coaches, analysts and managers: the African game model, 23 chapters, 50 drills (`coach/drills/*.json`, bilingual), the Indice Njangi. Read at `/book/methode/`. |
| **Ndamba** (the app) | `app/` | Bilingual (FR/EN) premium app: drill library, session builder, week periodization, team and match setup, live match tagging with the Indice Njangi report, video analysis, player space, the books. |
| **Mola** | `app/src/surfaces/mola/` | The agent: conversational onboarding, then actions inside the app (sessions, week plans, matches, players, convocations with approval). Optional LLM through `app/api/mola.ts` (set `ANTHROPIC_API_KEY` on Vercel). |

## Build

```bash
# books: web readers + print PDFs (needs Chromium from Playwright)
cd tools && npm install && cd ..
node tools/build_books.mjs --pdf

# app
cd app && npm install && npm run build      # runs scripts/build-content.mjs (drills, lessons, tables of contents) first
npm run dev
```

Deploy: Vercel, root directory `app`, framework Vite, output `dist`. `vercel.json` routes `/book/*` to the static readers and everything else to the app.

## Checks

```bash
node tools/check.mjs tome1/chapters/*.md        # word counts, dashes, schemas
node tools/check.mjs coach/chapters/*.md
node tools/check_drills.mjs coach/drills/*.json
```

## Illustrations

Art direction: `tome1/art/ART_DIRECTION.md` (skill `.claude/skills/cinematic-children-book/SKILL.md`), canonical characters `tome1/art/CHARACTERS.md`, every image's data in `tome1/art/scenes.mjs`. `node tools/art_prompts.mjs` writes the eight-slot prompts and reference lists to `tome1/prompts/` and the inventory to `tome1/art/inventory.json`. Images are generated with the image generation of the Codex app (ChatGPT) on Windows: `powershell -ExecutionPolicy Bypass -File run-all.ps1 -Only 'ch*' -Parallel 3` in the illustrations working folder (prompts and `.refs` copied to `prompts\`, reference images in `refs\` or `illustrations\`). The series cover (LIONCEAUX wordmark, numeral, title) is typeset over the painted art by `node tools/compose_cover.mjs`.

Shared diagram renderer: `tools/pitch.mjs` (one JSON spec draws the same pitch diagram in both books and in the app).
