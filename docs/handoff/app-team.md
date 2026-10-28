# Handoff: app-team (previous agent a419538ec0943156e, stopped by an interruption)

## Original brief

You are a senior React engineer and football coach. You are building the team and match part of "Njangi", a premium bilingual (French first, English second) app for football players, coaches and analysts, for William Foteping. Read /home/claude/njangi/docs/CONVENTIONS.md completely first and follow it exactly (stack, shared files you must not edit, i18n rules, design rules, no em or en dashes, testing). Read src/lib/formations.ts, src/lib/actions.ts (autoLineup, createMatch, addPlayer, createTeam, convocationText, whatsappLink, smsLink, mailLink, toICS, skillAvg) and src/lib/types.ts (Team, Player, Match, GamePlan, LineupSlot).

You own (replace the placeholders): app/src/surfaces/team/Roster.tsx, PlayerDetail.tsx, Matches.tsx, MatchSetup.tsx, MatchSheet.tsx, anything under app/src/surfaces/team/components/ (create a reusable, exported LineupBoard component there: other surfaces may import it), and the i18n namespace files app/src/i18n/fr/team.json and app/src/i18n/en/team.json. Dev server port: 5183.

Build:
1. Roster (/app/equipe): team header (name, age group, format, formation, edit in a modal); if no team, an empty state that creates one (createTeam); players grouped by line (gardiens, défense, milieu, attaque) with number badges, position, birth year, foot and a small competence average bar; « Ajouter un joueur » modal; « Importer une liste » (paste one name per line, optional number first); delete with confirmation.
2. Player detail (/app/equipe/:id): identity editing; the ten competences of the Njangi player (common:skills.*) each rated 1 to 4 with tap-to-set level chips and level descriptors (1 Découvre, 2 Applique, 3 Maîtrise, 4 Inspire, with a one-line description per competence and level in your namespace); an SVG radar chart of the ten competences; notes; contribution from tagged matches (count db.events by playerId and code, e.g. progressive passes, lines broken, regains in 5 s); suggested drills for the two weakest competences (filter DRILLS by `skills`).
3. Matches (/app/matchs): upcoming and past match cards (opponent, competition, date and time, venue, home/away, status badge, score, and for finished matches with events the Indice Njangi total from computeNjangi in src/lib/njangi.ts); « Nouveau match ».
4. Match setup (/app/matchs/nouveau and /app/matchs/:id/modifier): a polished 4-step wizard with a progress header. Step 1 Infos: opponent, competition, date, time, venue, home or away, format (5, 7, 8, 9, 11), half length. Step 2 Composition: formation picker from FORMATIONS[format]; a pitch board (LineupBoard: a green or paper-style pitch in DOM/SVG with slot markers at the formation coordinates, player number and short name, works on phone) where tapping a slot opens a player picker sheet; « Composer automatiquement » (autoLineup); bench (subs) list; captain choice. Step 3 Plan de jeu: five text areas for the four moments and set pieces (possession, transition défensive, défense, transition offensive, coups de pied arrêtés) with tap-to-insert suggestion chips based on the Njangi intentions (e.g. « Sortir à trois avec le pivot entre les centraux », « Cinq secondes de contre-pression », « Fixer à droite, renverser à gauche ») in both languages. Step 4 Convocation: the generated message (convocationText), editable, with buttons WhatsApp, SMS, e-mail, copy, and an .ics download; save. Editing an existing match pre-fills everything.
5. Match sheet (/app/matchs/:id): a clean match card (teams, date, venue, competition), read-only lineup board, bench, captain, game plan, convocation shortcut; buttons « Lancer l'analyse en direct » (set status 'live' then navigate to /app/analyse/live/:id), « Voir le rapport » (/app/analyse/rapport/:id) when the match has events or is done, « Saisir le score » for untagged matches (sets status done), edit, delete. Print view.

Quality bar: top-tier coaching software (think the best match-day apps), beautiful lineup board, warm and clear, fast on a phone. Test in French and English with Playwright screenshots (390x844 and 1280x800) after seeding the demo (see CONVENTIONS), look at them, fix layout issues and console errors. Type-check must pass for your files.

Final report under 400 words (what you built, shared-file diffs you need, gaps).

## Files the previous agent wrote or edited

/home/claude/njangi/app/src/i18n/en/team.json
/home/claude/njangi/app/src/i18n/fr/team.json
/home/claude/njangi/app/src/surfaces/team/MatchSetup.tsx
/home/claude/njangi/app/src/surfaces/team/MatchSheet.tsx
/home/claude/njangi/app/src/surfaces/team/Matches.tsx
/home/claude/njangi/app/src/surfaces/team/PlayerDetail.tsx
/home/claude/njangi/app/src/surfaces/team/Roster.tsx
/home/claude/njangi/app/src/surfaces/team/components/LineupBoard.tsx
/home/claude/njangi/app/src/surfaces/team/components/PlayerPicker.tsx
/home/claude/njangi/app/src/surfaces/team/components/ShareBar.tsx
/home/claude/njangi/app/src/surfaces/team/components/SkillRadar.tsx
/home/claude/njangi/app/src/surfaces/team/components/bits.tsx
/home/claude/njangi/app/src/surfaces/team/components/forms.tsx
/home/claude/njangi/app/src/surfaces/team/components/lineup.ts
/tmp/claude-0/-home-claude/3d46110d-d084-5c89-9cdb-0dfdba35d143/scratchpad/flow.cjs
/tmp/claude-0/-home-claude/3d46110d-d084-5c89-9cdb-0dfdba35d143/scratchpad/shots.cjs

## Its last progress notes (oldest first)

- I'll simplify `ConfirmModal` to import `Modal` directly, then write the LineupBoard.

- Next, the Roster page.

- Now the Player detail page with the radar chart.

- Now the Matches list.

- Now the share bar and the pitch player-picker, then the wizard.

- Now the 4-step match wizard.

- Let me clean up two rough spots: the convocation aside, and the chip toggle logic.

- Now the match sheet.

- The type-check passes. Next I'll start the dev server and write a Playwright script.

- The console only shows Google Fonts failing to load in the sandbox and React Router future-flag warnings from the shared App.tsx, none from my code. Here are the screenshots.

- The player lists overflow the 390 px viewport because grid items keep their min-content width. The stat labels also repeat the number. Fixing both.

- The remaining hits are the clipped decorative circle and a truncated span, both inside overflow-hidden containers. Those are false positives. Here's the Matches page.

- The past-match row cuts off the opponent behind our long team name, and the Njangi dial is hidden at 390 px. I'll lead with the opponent instead.

- The radar labels on the left ("Contre-pression", "Protection") are clipped. I'll widen the radar viewBox, then check the match sheet.

- I'm making the lineup board keep the keeper's name inside the pitch frame by insetting the slot coordinates slightly along the length.

- Next, a flow test: the wizard steps, autoLineup, the picker, plan chips, save, score entry, and live navigation.

- All flows pass in French. Now I'll look at the wizard screenshots.

- The overlay in the middle is just the sticky footer and tab bar caught by the full-page capture. I'm limiting captain choices to starters so the list stays short, then checking the call-up step.

- The Indice Njangi showed as "89.6", so I'll check whether `computeNjangi` changed upstream.

- The total now has one decimal on purpose. In the small dial I'll round it, and in the sheet card show it with locale formatting.

- The desktop radar labels are too small to read. I'll enlarge them, then run the English flow.

- The English flow passes too. Let me check the picker sheet and the desktop wizard.

- You've hit your weekly limit · resets Oct 29, 6pm (America/New_York)

- Editing a match lost its bench: the players query briefly returned an empty list before the match's team was known. I'll tie the result to its team id.

- The plan step pre-fills and recognises ideas already in the text. Last checks: the bench on edit, no forbidden dashes, final type-check.
