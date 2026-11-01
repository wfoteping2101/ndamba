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

## Done (v0.2, 2026-11-01)
- Full-size 11v11 layout and three stadiums (terraces, floodlights, dugouts, crowd), 7v7 and 5v5 on the street grounds, 18-player squads, formations per format.
- Seven more teams (four neighbourhood clubs, three book opponents).
- Game speed setting (medium by default), FC-style HUD (clock bug, radar, player plates, name tags), labelled touch buttons, stadium fly-over intro with line-ups.
- Campaigns: Les Lionceaux story (8 chapters), Ligue des Quartiers, Coupe des Quartiers with penalty shoot-out, Carrière d'entraîneur (Njangi-driven simulated manager mode), Académie Njangi drill library.
- Website: the game lives at /football/ on the Ndamba site as "Ndamba Soccer Pixel".

## Doing
- Hands-on play test on the PC with a real controller and on a phone browser (needs William's hands): speed feel, 11v11 AI spacing, touch button placement.

## Next (Phase 5 to 9)
- Rig polish pass: eye whites, number on the back, kit collar, better GK dive silhouettes seen from the side, celebration variety, hair variety for girls.
- Crests as original pixel icons; the Yaoundé twelve and the Douala ten as more teams.
- 8v8 (the book's Part I format) as a fourth format; extra time option.
- Story: walkable Bonamoussadi scene, dialogue system, cutscenes between the chapter texts and the matches; academy drills as interactive missions in the engine (today: library + done list).
- Manager mode: injuries with treatment choices, tactics per match, a transfer deadline, trophies screen.
- League: promotion/relegation across seasons (today: one season, replayable).
- Two-player local (second keyboard map and second gamepad), co-op.
- Android build on the PC (SDK, JDK, debug keystore), real-device touch test.
- Wiki (in-game encyclopedia) and the public companion wiki.
- Weather: rain visuals exist; wind, dusk lighting pass, night lights for upgraded grounds.
- Steam: Steamworks account steps, store assets, SteamPipe scripts (see docs/release when written).

## Later
- Pan-African cup, world map, stadium upgrades, team editor with export/import, voice commentary, music by a composer, online play (not promised).
