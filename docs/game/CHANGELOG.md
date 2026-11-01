# NDAMBA changelog

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
