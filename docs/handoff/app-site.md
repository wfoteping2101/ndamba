# Handoff: app-site (previous agent a65810684d827d01f, stopped by an interruption)

## Original brief

You are a senior product designer and React engineer. You are building part of "Njangi", a premium bilingual (French first, English second) football app and its public site, for William Foteping. Read /home/claude/njangi/docs/CONVENTIONS.md completely first and follow it exactly (stack, shared files you must not edit, i18n rules, design rules, no em or en dashes, testing). Also skim /home/claude/njangi/tome1/BIBLE.md (the children's novel Kaydoudou & BriBri) and /home/claude/njangi/coach/OUTLINE.md (the coaching book La Méthode Njangi) so your copy is accurate about the products.

You own these files (replace the placeholders): app/src/surfaces/site/Landing.tsx, Library.tsx, Pricing.tsx, Settings.tsx, anything under app/src/surfaces/site/components/, and the i18n namespace files app/src/i18n/fr/site.json and app/src/i18n/en/site.json. Dev server port: 5181.

Build:
1. Landing (/): a beautiful, premium, editorial marketing page that makes an African coach, a parent and a federation director all want in. Sections: hero with the mantra (« Une nation africaine championne du monde en 2030 ou en 2034 ») and the motto, two CTAs: « Commencer avec Mola » (to /bienvenue) and « Essayer la démo » (calls seedDemo('coach', lang) from src/lib/seed.ts then navigates to /app; also a smaller « Démo joueur » using seedDemo('player', lang)); an explanation of the Njangi (the Cameroonian tontine: everyone contributes, the pot circulates, everyone benefits; possession must circulate with a purpose) with an animated inline SVG of a ball travelling between players in a circle (CSS animation, respects prefers-reduced-motion); the four products as cards (the novel Kaydoudou & BriBri tome 1 for children 8 to 12, La Méthode Njangi for coaches/analysts/managers with 50 drills, the app for players/coaches/analysts, Mola the agent that acts for you); a features section by audience (players, coaches, analysts, clubs and federations) with real features of the app (drill library, session builder, week periodization MD-4 to MD-1, match setup and lineups, live tagging with the Indice Njangi, video analysis with drawing, player challenges, the 40 Ball Lessons); a live-analysis teaser showing an Indice Njangi gauge (SVG) with five sub-indices (Progression, Pénétration, Fixation, Reprise, Contrôle); a Mola section with a mock chat that types out an example (« Prépare ma semaine avant le match de samedi » then steps ticking); a short "2030 / 2034" roadmap band; a pricing teaser linking to /premium; a final CTA. Book covers are drawn in CSS/SVG (a warm painted look: red earth, green, gold), with an optional real cover image if /art/tome1-cover.jpg exists later (use an <img> with onError fallback to the drawn cover). Anchors #app and #mola exist for the nav.
2. Library (/livres and /app/livres, same component; it renders inside SiteLayout or AppLayout): both books with their cover, description, tables of contents from TOME1_TOC and METHODE_TOC (src/content; handle empty arrays with a tasteful "chapters arriving" state), « Lire en ligne » buttons (plain <a href> to /book/tome1/ and /book/methode/, with #ch-NN anchors for chapters), « Télécharger le PDF » (<a href> to the PDFs in BOOKS from src/lib/config.ts). The novel's five parts: I Cameroun (le cœur), II États-Unis (la raison), III France (les yeux), IV Espagne (la carte), V Angleterre (le souffle).
3. Pricing (/premium and /app/premium): the five plans from PLANS in src/lib/config.ts with features (common:plans.features.*), monthly/annual switch (annual = 10 months price), prices in USD and approximate FCFA (fcfa() helper), Coach Pro highlighted; buttons: if a profile exists, « Activer (démo) » sets profile.plan via db.profile.update and shows a confirmation (payments are not connected yet: say so plainly and mention Mobile Money and cards are coming); else go to /bienvenue. A short FAQ (books always free to read, data stays on your device for now, cancel anytime, federations on quote).
4. Settings (/app/reglages): profile editing (name, role, language, country, city, club), teams management (list, create with createTeam, switch active team via profile.activeTeamId, edit name/age group/format/formation using FORMATIONS keys), data export (download a JSON of all Dexie tables) and import (restore from that JSON with confirmation), reset everything (resetAll from src/lib/db.ts behind a confirmation), about (version, author William Foteping, Lemon Network Solutions).

Quality bar: this must look and feel like a top-tier product (think the best football apps), warm and African, not a template. Mobile-first at 375 px. Test in French and English with Playwright screenshots (390x844 and 1280x800) and look at them; fix what looks off. Type-check must pass for your files.

Final report under 400 words (what you built, shared-file diffs you need, gaps).

## Files the previous agent wrote or edited

/home/claude/njangi/app/src/i18n/en/site.json
/home/claude/njangi/app/src/i18n/fr/site.json
/home/claude/njangi/app/src/surfaces/site/components/BookCover.tsx
/home/claude/njangi/app/src/surfaces/site/components/HeroPitch.tsx
/home/claude/njangi/app/src/surfaces/site/components/IndiceTeaser.tsx
/home/claude/njangi/app/src/surfaces/site/components/MolaChat.tsx
/home/claude/njangi/app/src/surfaces/site/components/NjangiCircle.tsx
/home/claude/njangi/app/src/surfaces/site/components/PagneBand.tsx

## Its last progress notes (oldest first)

- Now let me check the remaining pieces I need: the vercel config, how the Onboarding route behaves, and whether `/art` or `/downloads` exist.

- You've hit your session limit · resets 1:50am (America/New_York)

- Picking up where I stopped: I've read the conventions, the shared libs, the book docs and the content API. None of my files exist yet, so I'm writing them now, starting with the i18n namespace.

- Both namespace files are written. Next, the shared components: the wax-print band, the drawn book covers, the animated Njangi circle and the hero pitch.

- Now the drawn book covers. Each one is self-contained SVG, and the tome 1 cover can be swapped for a real image later.

- Covers are done. Now the animated Njangi circle. Per-segment keyframes are generated so each part of the pot stays lit until the shot, and reduced motion gets a complete static picture.

- Now the interactive Indice Njangi teaser. It runs the real `computeNjangi` from lib, so the numbers match the app.

- Now the Mola mock chat. It types the request, ticks the steps, and only starts when scrolled into view; with reduced motion it shows the final state straight away.

- You've hit your weekly limit · resets Oct 29, 6pm (America/New_York)
