# NDAMBA changelog

## 0.2.0 (2026-11-01), "Ndamba Soccer Pixel": 11-a-side, campaigns
- 11v11 on a full-size 105x68 m pitch (new `full` layout, 1140x760 world, proper markings), three stadiums with terraces, floodlights, dugouts and a crowd of 100+ (Stade du Wouri, Stade de la Colline, Stade des Hauts-Plateaux); 7v7 and 5v5 remain on the neighbourhood grounds. Formats are data-driven (lineup/lineup7/lineup11, formation/formation7/formation11) and squads have 18 players.
- Eleven teams: four more neighbourhood clubs (Aigles d'Akwa, Port de Bonabéri, Carrefour Ndokoti, Rois de New-Bell) and the three Part I opponents of the novel (Gars de la Pharmacie, Aigles de Makepe, Cobras de Bonabéri).
- Game speed setting (slow / medium / fast; medium by default) applied as a simulation time scale, with the clock still counting real time and the sprite animations following the pace. Default halves 4 minutes.
- HUD rebuilt in the FC style: clock bug with stacked scores, radar, player plates (number, name, stamina pips), name tags over the controlled player and the ball carrier (setting "player names"), labelled touch buttons (PASSE / TIR / GESTE / SPRINT / JOUEUR) and a larger stick.
- Stadium intro: nine-second camera fly-over along the stands with the ground card (name, city, capacity, format) then the two line-ups; any press skips it. QA flag `--intro` keeps it in autoplay.
- Goals are drawn at their logical width (the 3/4 squash no longer narrows the mouth).
- Campaigns: "Les Lionceaux" story (8 chapters mapped from tome 1 with their own opponent, ground, format, weather, objective and lesson), "Ligue des Quartiers" (8 teams, double round robin, other fixtures quick-simulated), "Coupe des Quartiers" (knockout, playable penalty shoot-out scene), "Carrière d'entraîneur" (manager mode: train a Ligue 3 club with the Code Njangi drills, matches simulated by an event model scored with the real Indice Njangi, promotions to Ligue 1 and the continental cup), "Académie Njangi" (library of the 64 drills with drawn diagrams and a done list).
- Save slots: league, cup, story, manager, academy; results flow back to the campaign screen (`Game.pending`, `return_to`).
- Tests: 2,600+ checks (11v11 match, campaigns, story judge, quick sim, shoot-out) plus separate manager UI and academy test scenes; screenshot helper `tests/screenshot.tscn`.

## 0.1.0 (2026-10-31), first playable
- New Godot 4.7 project `game/` with the complete 5v5 match loop: human vs CPU, CPU vs CPU, friendly setup, result screen, pause, settings, FR/EN.
- Four neighbourhood teams and four grounds; terre battue, grass, sand and rain (mud) surface physics.
- Original pixel-art pipeline (`art/src`) producing every player sheet, ground, prop and crowd; palette-swap shader for kits and skin tones.
- Original synthesized audio (`audio/src`).
- Team AI with five difficulty profiles, goalkeepers with reactions, dives, catches and distribution.
- Rules: kick-off, kick-ins, corners, goal kicks, direct free kicks, penalties (from fouls), goals and crossbar, two halves, accelerated clock, stats.
- Touch overlay for phones and mobile browsers; gamepad and keyboard maps.
- Headless test suite (471 checks) and QA autoplay mode with screenshots.
- Web (PWA, single-threaded) and Windows exports; Android preset prepared (build on the PC).
- Research dossiers under `docs/research`, bible and logs under `docs/game`.
