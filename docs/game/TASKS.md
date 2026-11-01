# NDAMBA task board

Status: done / doing / next / later. Keep this honest: nothing is "done" until it ran and was looked at.

## Done (v0.1, 2026-10-31)
- Research dossiers (Batovi, Cameroon neighbourhoods, platform feasibility, references and licences, book content map), 64-drill academy index.
- Game design bible, decisions log, changelog.
- Content: 4 teams (Lionceaux de Bonamoussadi, Requins de Bépanda, Panthères de Deïdo, Mokolo Étoiles), 8 players each with attributes and looks, 4 grounds, 4 surfaces, FR/EN strings.
- Art pipeline: player rig (8 directions, 16 animations, 6 kit patterns, 5 hairstyles, keeper sheets), terre battue / grass / sand / mud grounds, bamboo and metal goals, houses, trees, props, crowd, ball, dust.
- Match engine: ball physics, players, tackles, keepers, team AI with 5 difficulty profiles, rules (kick-off, kick-ins, corners, goal kicks, free kicks, penalties, goals, crossbar, halves, full time), stats, commentary.
- Controls: keyboard, gamepad, touch overlay (floating stick, A/B/X/Y, sprint, pause), aim assist, simple controls option, auto and manual switching.
- Screens: dedication, title with live attract match, friendly setup, match HUD, pause, result, settings (audio, commentary, assist, touch size/opacity/side, reduced motion), FR/EN toggle.
- Save: versioned settings and results history (`user://saves`).
- Tests: 471 headless checks (content, save, ball, posts, rules, goals, outs, AI vs AI full match, simulated human input). QA autoplay mode with screenshots and qa.json. Rendered under Xvfb at 66 fps average.
- Exports: Web (single-threaded, PWA) verified in headless Chromium with zero console errors; Windows x86_64 exe.

## Doing
- Sync to the PC and verify the Windows exe launches there with a real controller (needs William's hands for the controller test).

## Next (Phase 5 to 9)
- Rig polish pass: eye whites, number on the back, kit collar, better GK dive silhouettes seen from the side, celebration variety, hair variety for girls, "rags" kit mode for the Lionceaux story matches.
- More teams: Aigles de Makepe, Cobras de Bonabéri, Gars de la Pharmacie (book), then the Yaoundé twelve and the Douala ten; crests as original pixel icons.
- 7v7 and 8v8 formats (larger pitch art, formations), the book's own format for Part I matches.
- Coupe des Quartiers: bracket, group stage option, extra time, penalty shoot-out, trophies, saved progression.
- Ligue des Quartiers: calendar, table, promotion/relegation, seasons.
- Académie Njangi: Tier 1 drills (24) as interactive missions in the engine, star ratings, wiki links.
- Les Lionceaux story: Part I chapters as playable beats (see BOOK_CONTENT_MAP.md), walkable Bonamoussadi scene, dialogue system, cutscenes.
- Two-player local (second keyboard map and second gamepad), co-op.
- Android build on the PC (SDK, JDK, debug keystore), real-device touch test.
- Wiki (in-game encyclopedia) and the public companion wiki.
- Weather: rain visuals exist; wind, dusk lighting pass, night lights for upgraded grounds.
- Steam: Steamworks account steps, store assets, SteamPipe scripts (see docs/release when written).

## Later
- Pan-African cup, world map, stadium upgrades, team editor with export/import, voice commentary, music by a composer, online play (not promised).
