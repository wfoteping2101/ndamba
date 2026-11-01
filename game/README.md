# NDAMBA (game), Les Lionceaux: Football des Quartiers

Pour BriBri et Kaydoudou. A 2D pixel-art arcade football game set on the red-earth pitches of Cameroon. Godot 4.7.2, GDScript, Compatibility renderer. Version 0.2.0 ("Ndamba Soccer Pixel": 11v11 stadiums, 7v7 and 5v5 street, story / league / cup / manager / academy).

## Run

- **Editor / headless on the PC**: `"%LOCALAPPDATA%\Microsoft\WinGet\Links\godot.exe" --path C:\Users\admin\games\ndamba\game` (first open imports assets; wait for it).
- **Windows build**: `builds\windows\NDAMBA.exe` (self-contained, pck embedded). Windowed 1280x720, F11 is not bound yet; use the window controls.
- **Web build**: serve `builds\web\` with any static server (`npx.cmd serve builds\web` or Netlify). It is a PWA, single-threaded, no special headers needed. Mobile browsers show the touch controls automatically in landscape.
- **Play**: "Match amical", choose teams, ground, format (11v11 / 7v7 / 5v5, fitted to the ground), half length, game speed, difficulty, weather, who you play (incl. CPU vs CPU to watch).
- **Campaigns**: Les Lionceaux (story, 8 chapters), Ligue des Quartiers, Coupe des Quartiers (penalties when drawn), Carrière d'entraîneur (simulated manager mode driven by the Code Njangi), Académie Njangi (64 drills).
- **Match flow**: stadium fly-over with line-ups (press anything to skip), kick-off, HUD with clock bug, radar, player plates and name tags.

## Controls

| Action | Keyboard | Controller (Xbox layout) | Touch |
|---|---|---|---|
| Move | W A S D or arrows | Left stick, d-pad | Floating stick |
| Sprint | Shift | RB or RT | >> |
| Pass (no ball: tackle) | J | A | PASSE |
| Shoot, hold to charge (no ball: slide) | K | B | TIR |
| Through ball (no ball: tackle) | L | X | GESTE |
| Switch player | Space | Y | JOUEUR |
| Pause | Esc | Menu | II |

Settings: music, effects, game speed (slow/medium/fast), player names, commentary, aim assist, simple controls (kids), touch size and opacity, left-handed layout, reduced motion, language (FR/EN).

## Tests and QA

```
cd C:\Users\admin\games\ndamba\game
"%LOCALAPPDATA%\Microsoft\WinGet\Links\godot_console.exe" --headless --path . --import
"%LOCALAPPDATA%\Microsoft\WinGet\Links\godot_console.exe" --headless --path . res://tests/run_tests.tscn
"%LOCALAPPDATA%\Microsoft\WinGet\Links\godot_console.exe" --headless --path . res://tests/debug_match.tscn   (balance soak: one AI vs AI match with stats)
"%LOCALAPPDATA%\Microsoft\WinGet\Links\godot.exe" --path . -- --qa C:\Users\admin\games\ndamba\builds\qa --half 1.5   (rendered autoplay: screenshots + qa.json)
```
Last run (cloud, 2026-10-31): 471 passed, 0 failed. QA autoplay: 4-1, 66 fps average under software rendering, 13 screenshots, 155 events. Web build: zero console errors in headless Chromium.

QA flags: `--qa <dir>`, `--half <minutes>`, `--teams <home_id> <away_id>`, `--stadium <id>`, `--format 5v5|7v7|11v11`, `--speed slow|medium|fast`, `--intro` (keep the fly-over, shots intro_a/intro_b), `--difficulty 0..4`, `--weather dry|rain`, `--lang fr|en`.
Other test scenes: `res://tests/manager_ui_tests.tscn`, `res://tests/academy_tests.tscn`, `res://tests/manager_calib.tscn -- --seasons 8` (manager soak), `res://tests/screenshot.tscn -- --scene res://scenes/x.tscn --out shot.png --prep league|cup|story|pens|touch` (needs a display; on Linux `xvfb-run`).

## Exports

Presets in `export_presets.cfg`: Web (to `../builds/web/index.html`), Windows Desktop (to `../builds/windows/NDAMBA.exe`), Android (debug APK; needs the Android SDK, JDK and export templates on the PC, see `docs/research/PLATFORM_FEASIBILITY.md`).
```
godot_console --headless --path . --export-release "Web" ../builds/web/index.html
godot_console --headless --path . --export-release "Windows Desktop" ../builds/windows/NDAMBA.exe
```
Export templates for 4.7.2 must be installed (Editor > Manage Export Templates).

## Regenerating content and art

```
python3 content/gen_teams.py && python3 content/gen_stadiums.py && python3 tools/sync_game_content.py
python3 art/src/gen_players.py          (36 player sheets, about a minute)
python3 art/src/stadium.py              (grounds, goals, props, crowd, ball, dust)
python3 audio/src/synth.py              (sound effects and the music sketch; convert long ones to ogg with ffmpeg)
```
Preview sheets: `python3 art/src/rig.py --real --anims idle,run,kick` writes `art/previews/`.

## Layout

```
game/           Godot project (scenes, football/, ui/, scripts/, shaders/, assets/, content/, tests/)
content/        source data (teams, stadiums, academy index, strings) and generators
art/src         pixel-art generators and palettes; art/previews review sheets
audio/src       synthesized audio generator
docs/research   dossiers; docs/game bible, decisions, tasks, changelog
builds/         exports (git-ignored)
```

## Known limitations (v0.2)
- The story chapters are text + match (no walkable scenes or cutscenes yet); the academy is a library (drills are not interactive missions yet).
- The league is a single season (no promotion between seasons); the manager career is fully simulated (no engine matches).
- Keeper dive sprites seen from the side are compact; a dedicated art pass is planned.
- Android has a preset but no build yet (needs the SDK on the PC).
- Music is a synthesized sketch, not a finished soundtrack.
