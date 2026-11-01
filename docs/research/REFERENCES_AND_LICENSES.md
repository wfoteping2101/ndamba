# References and Licenses: NDAMBA licensing plan

Research dossier for NDAMBA. Compiled 2026-10-31. Rule one: every sprite, tile, animation, line of code, sound effect and piece of music in NDAMBA is original work created for the project or licensed under terms listed here. This document records what may be used, under which license, and what must never be used.

## 1. Ownership baseline

- Code: original GDScript under the project's own license (to be chosen; MIT or proprietary). Godot Engine itself is MIT and requires its license text and copyright notice in distributed builds; the docs supply a ready-made credits string.
- Art: original pixel art drawn for NDAMBA. No ripped sprites, no traced sprites from other games, no AI-generated art trained on identifiable copyrighted game art presented as original.
- Audio: original synthesized SFX and original compositions (section 3).
- Names: neighborhoods, cities, foods and vehicles are real public places and common nouns and may be used. Team names are fictional ("Mokolo Lions", not any real club). Player names are fictional. BriBri and Kaydoudou are the dedication, not public figures.

## 2. Pixel fonts (verified licenses)

Only fonts with a clear permissive license are shortlisted. All verified on their repository or canonical page.

1. Press Start 2P. Author: Cody "CodeMan38" Boisclair, 2011. License: SIL Open Font License 1.1, Reserved Font Name "Press Start". Repo: https://github.com/codeman38/PressStart2P (LICENSE.txt). OFL means: free for commercial use and embedding, may be bundled with the game, must ship with its license text, cannot be sold alone, modified versions cannot use the reserved name. Use: title screens, scoreboards, 8 px grid.

2. Silkscreen. Designer: Jason Kottke, 2001. License: SIL Open Font License 1.1. Repo: https://github.com/googlefonts/silkscreen. Very compact and readable at small sizes; good for HUD numbers and menus at 640x360.

3. Pixel Operator. Author: Jayvee Enaguas (HarvettFox96). License: Creative Commons Zero 1.0 (public domain dedication). Source: https://notabug.org/HarvettFox96/ttf-pixeloperator (NotABug, not GitHub; dafont lists the same license). Fifteen variants including Mono, 8 px and small caps. CC0 means no attribution required, though a credit is good practice.

4. PixelMplus (optional, for a possible Japanese localization). Author: itouhiro, built on M+ BITMAP FONTS. License: M+ FONT LICENSE (free, permissive, redistribution allowed). Repo: https://github.com/itouhiro/PixelMplus. Sizes 10 and 12 px, Regular and Bold, Latin-1 included.

Checked and set aside:
- m5x7 and m6x11 by Daniel Linssen (itch.io). The m5x7 page carries the itch asset license field "Creative Commons Zero v1.0 Universal" together with the author note "free to use but attribution appreciated"; the m6x11 page says "free to use with attribution" with no named license. These are usable, and m5x7 is effectively CC0 on its page, but they are not hosted on GitHub and m6x11 has no formal license text. If used, keep a screenshot of the itch page and credit Daniel Linssen in the credits screen. Not part of the core shortlist because the brief asked for repository-backed licenses.

Plan: ship Press Start 2P for titles, Silkscreen or Pixel Operator for body and HUD, include each license file under `assets/fonts/<name>/LICENSE`, and list the fonts in the in-game credits.

## 3. Audio plan: original SFX and Cameroon-inspired original music

No recordings, samples or stems from existing songs are used. A composer writes original tracks from the following rhythmic briefs, which are paraphrased from published descriptions of each genre.

Makossa (Douala, Littoral; Duala people; name from a Duala dance word, coined by Nelle Eyoum; shaped from the 1950s, recorded from the 1960s; Manu Dibango's 1972 "Soul Makossa" carried it worldwide):
- Meter 4/4, typical tempo around 130 to 170 BPM.
- Strong, melodic electric bass groove is the signature; prominent brass stabs added from funk; disco strings in later styles; guitar alternates rhythm and lead with picking that borrows from bikutsi; lead voice with answering choir.
- Structure often borrows the Congolese rumba "sebene" pattern; a frenzied "secousse" or "balle à terre" section raises energy late in the song.
- Influences: assiko, highlife, merengue, rumba, funk, soul, gospel choirs.
- Game use: menus, Douala neighborhoods, coastal pitches (Kribi, Limbe), victory jingles. Brief: bass-led, bright, danceable, horns on goals.

Bikutsi (Yaoundé and the Centre; Beti and Ewondo people; the word means roughly "beat the earth"; popular form from Anne-Marie Nzié in the 1940s; Les Têtes Brûlées took it abroad after 1987):
- Meter 6/8 grouped 3+3 with a strong two-feel; fast and relentless.
- The balafon is the root instrument; the electric guitar imitates it (strings tied with cotton cord by Messi Me Nkonda Martin, foam damping by Zanzibar of Les Têtes Brûlées) for a dry "thunk" tone.
- Foot stomping, hand clapping, female choruses, shouted interjections.
- Game use: Yaoundé neighborhoods, match music under play, stamina and sprint sound design (the stomp). Brief: 6/8 at high tempo, damped guitar ostinato, call-and-response vocal hooks (wordless or original lyrics only).

Mbolé (Yaoundé popular quarters: Nkolndongo, Essos, Mvog-Ada, Etam-Bafia, Anguissa; born at funeral wakes about 25 years ago; mainstream since roughly 2017; Petit Malo's "Dans mon kwatta" (2016) about Nkolndongo; DJ Lexus often cited as precursor):
- A chanter improvises lines and a group of "répondants" answers; the beat comes from hand claps and whatever is at hand: buckets, saucepans, bottles; djembe, maracas and keyboards came later.
- Mid-tempo, loop-based, chant-driven, blends bikutsi, makossa and bend-skin feel; lyrics about street life, poverty, hope and unity.
- Game use: tournament hub, crowd chants, pre-match atmosphere, street scenes with benskins. Brief: clap-and-bucket percussion loops, group response hooks, keyboard riff, no sampled voices of real artists.

SFX: synthesized in-engine or with open tools (sfxr-style, tracker, modular synth); crowd beds built from layered synthesized noise and recorded original voices of consenting adults only.

## 4. What must never be used

- Any Batovi / Pixel Cup Soccer asset: sprites, tiles, UI, fonts, sound, code, team or tournament names, trailer footage. The analysis dossier is design study only.
- CAF, FIFA, FECAFOOT logos, trophy designs, competition names and branding; the Indomitable Lions name and crest; real club crests (Canon, Tonnerre, Union Douala, Coton Sport, PWD Bamenda and others); real kit designs.
- EA Sports FC / FIFA, eFootball, Football Manager assets, fonts, chants, commentary, UI patterns copied pixel for pixel.
- Real player likenesses, names, numbers or signature celebrations (including Eto'o, Milla, Mbappé, Onana); real coaches and officials.
- Photographs of real minors, including the dedicatees; no reference photos of children are stored in the repository.
- Recordings of Makossa, Bikutsi or Mbolé songs, even as temp music; no sampled stems; no lyrics from existing songs.
- Stock sprites from marketplaces without a verified license file; AI outputs that imitate a named artist's style.
- Trademarked brand names on in-game signage (beer, telecom, moto brands) unless replaced by fictional equivalents.

## 5. Stardew Valley

Stardew Valley is a quality benchmark only: a solo developer's finished, polished, warm pixel-art game with a strong sense of place. NDAMBA borrows none of its art, music, code, fonts, characters, UI layouts or writing. The reference is used in design discussions for "level of finish" and "respect for the player's time", nothing more.

## 6. awesome-gamedev-agent-skills

Repository: https://github.com/gamedev-skills/awesome-gamedev-agent-skills. License: Apache-2.0 (with a NOTICE file for attribution and trademark notes). 77 skills in 6 categories at time of research. Install with `npx skills add gamedev-skills/awesome-gamedev-agent-skills` (Node 22.20 or newer), or as a Claude Code plugin marketplace (`gamedev@awesome-gamedev-agent-skills`, with smaller `router` plus `godot` bundles), or by copying a skill folder into `.claude/skills/`.

Skills relevant to a Godot 2D sports game:
- Godot engine: godot-gdscript, godot-nodes-scenes, godot-signals-groups, godot-2d-movement, godot-tilemap, godot-physics, godot-ui-control, godot-animation, godot-shaders, godot-resources, godot-audio, godot-multiplayer (local and later online), godot-export, godot-gdscript-headless-testing.
- Disciplines: game-feel (screen shake, hit-stop, squash and stretch), input-systems (action mapping, rebinding, multi-device, buffering), camera-systems (2D follow, deadzone, look-ahead), physics-tuning (fixed timestep, stability), audio-design (buses, adaptive music, ducking), performance-optimization, game-ui-ux (HUD, safe areas, focus navigation), create-game-assets (sprite and tile art direction), level-design, game-ai and ai-behavior-trees-utility-ai (opponent AI), save-systems.
- Workflows: steam-publish (Steamworks setup, depots, store page, release checklist), itch-publish (butler uploads), prototype-fast, game-jam.
- Not relevant: Unity, Unreal, Roblox, web engines, 3D, roguelike, RPG, FPS and other genre skills. There is no sports-game or pixel-art-specific skill; create-game-assets is the nearest.

Apache-2.0 allows using these skills in a commercial project; keep the NOTICE text if any skill content is redistributed inside the repository.

## 7. Compliance checklist

- `assets/fonts/*/LICENSE` present for every bundled font.
- `THIRD_PARTY_LICENSES.md` at the repo root listing Godot (MIT), fonts, GodotSteam (version pinned, MIT at 4.16.x, license change announced for 4.20), and any skills content.
- In-game credits screen with Godot, fonts, composer, and thanks.
- Asset intake form: every new file needs author, date, license and source before it enters `assets/`.
- Pre-release audit: search the repo for real club names, brand names and sampled audio.

## Sources

- https://github.com/codeman38/PressStart2P
- https://raw.githubusercontent.com/codeman38/PressStart2P/master/LICENSE.txt
- https://github.com/googlefonts/silkscreen
- https://www.dafont.com/pixel-operator.font
- https://github.com/itouhiro/PixelMplus
- https://managore.itch.io/m5x7
- https://managore.itch.io/m6x11
- https://en.wikipedia.org/wiki/Makossa
- https://en.wikipedia.org/wiki/Bikutsi
- https://www.africanews.com/amp/2023/01/13/mbole-the-soundtrack-to-life-and-death-in-cameroon/
- https://www.voanews.com/a/cameroon-s-funeral-music-gives-voice-to-frustrated-youth/6917021.html
- https://cameroon-tribune.cm/article.html/37605/fr.html/details_2
- https://github.com/gamedev-skills/awesome-gamedev-agent-skills
- https://godotsteam.com/blog/category/licenses/
- https://godotassetlibrary.com/asset/j4zWKK/godotsteam-gdextension-4.4
