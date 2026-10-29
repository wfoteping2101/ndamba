# Ndamba games: art bible

This is the visual and sound reference for both games (LE CODE NJANGI and LIONCEAUX). The identity of
the book characters is fixed by `tome1/art/CHARACTERS.md` and `tome1/art/ART_DIRECTION.md`; this file
says how the games carry it into real-time 3D. When the two disagree on a character, the book's
character sheet wins.

## 1. Direction

- **Console-grade realism, our own.** Realistic proportions, skinned bodies driven by motion capture,
  physically based materials, two-cascade sun shadows, ambient occlusion, a broadcast colour grade,
  cinematic framing. The bar is a modern football console game; the look, the people, the places and
  the interface are ours.
- **Nothing copied.** No EA (or any other publisher's) assets, interface layouts, menus, fonts, logos,
  stadiums, kits or player likenesses. No real club, league or sponsor names or crests. Real
  footballers are never modelled (Roger Milla is only named in the book's words, never shown).
- **Africa as it is.** Bonamoussadi is red earth, tin roofs, plaster walls, a mango tree, benskins,
  wires, dust in the light, people of every age watching. Dark skin is lit with warm sub-surface
  tones and never washed out; hair is textured, never helmet-like.
- **Read on a phone first.** Silhouettes and colours must read at 375 px wide: the ball is drawn a
  touch larger than life, key characters are framed at mid shot or closer for dialogue, subtitles never
  cover a face.

## 2. People

### Canon locks (from `tome1/art/CHARACTERS.md`, implemented in `app/src/games/lionceaux/cast.ts`)

| Character | Never changes |
|---|---|
| BriBri (12 in Part I) | taller and thinner than Kaydoudou (his brother's head reaches his chin); thin shaved part on HIS left; calm gaze; faded forest-green shirt `#2E6B45`, white collar and trim, white number 8; the notebook in green and orange pagne from chapter 7 |
| Kaydoudou (10 in Part I) | red sock on the RIGHT foot, yellow sock on the LEFT; gap between the front teeth; soft round afro; sun-yellow tee `#F2C230` with a vertical red band `#D63C2F` on the left chest, green shorts with white trim |
| Mami's ball | light brown leather `#B98B5E`, worn, hand stitches; from chapter 2 a square of red `#C9362B` and yellow `#F0B92E` wax pagne; on the evening of the final (chapter 8, the book's words) three signatures in black felt: « Ousmane. Les mains. », « Mireille, la Gazelle » (and smaller « Ne m'oubliez pas, sinon gare. »), « Le ballon doit voyager. Fokou. ». The signatures the character sheet lists from chapter 16 come later. |
| Tonton Fokou | elder, worn cap, whistle, a cane, stands on his good leg; sits on his yellow bidon under the mango tree |
| Mami | small and very upright, pagne headscarf; dances like Roger Milla (her words) |

Characters the book does not describe physically wear plain, mismatched clothes (« une équipe de
chiffons ») and get no detail that could contradict the text. Rival teams wear the kits the chapters
give them: the Requins de Bépanda in blue with a fin drawn on the back, the Panthères de Deïdo in
yellow with black spots (taller than the Lionceaux, the captain taller still), Monsieur Pieuvre in
black and yellow with long arms.

### How the figures are made

- Bodies: nine archetypes built offline from MakeHuman / MPFB2 CC0 data by `app/tools/humans/`
  (boy, boyLean, boyBig, girl, man, woman, womanBig, oldman, oldwoman), with garments cut from the body,
  real fingers, eyes with irises, eyebrows drawn as arches, hair as fur shells (crop, afro, twists,
  puff, cap, wrap) and a straight bob that falls to the chin (`long`). Every archetype has a winter
  wardrobe for Part II (Waldorf, Maryland): long sleeves, long trousers, and a padded coat quilted in
  channels (BriBri's new red anorak, « qui fait un bruit de sac plastique »). Kaydoudou's red sock and
  yellow sock still show under his pyjama trousers in the snow.
- Skin: warm dark tones in the family `#5B3A27` (shadow `#3A2419`), smooth mottling, two skin
  textures per archetype; the runtime paints skin, kit colours, numbers, stripes, patterns (wax,
  leaves, circles) and mud.
- Motion: CMU motion capture retargeted onto the rig (locomotion, kicks with both feet, celebrations,
  talk, sit, sit on the ground, slip, dance, sew, throw, laugh, mope, get up). Story poses (point, wave,
  fist, hand on the heart, palm, hold, open arms, microphone hand, embrace, drumming, a hand on the
  armrest) are arm IK layered on a clip.
- Crowds: low-polygon figures (`crowd_*.glb`) that cheer and hop, seated on walls and roofs, standing
  along the touchlines, children in the mango tree on the day of a big match.

## 3. Places (Lionceaux, `app/src/games/lionceaux/sets/`)

| Set | Book | What it must show |
|---|---|---|
| `bona` | Bonamoussadi, Douala | the red-earth pitch with bamboo goals and flags, the mango tree and Fokou's yellow bidon, Monsieur Bilé's low wall with fence and barbed wire, tin-roofed houses, palms and banana plants, electricity poles and sagging wires, benskins; options: mud and puddles (ch04), bamboo triangles (ch04), crowd density, night, the drums and Mami's yellow taxi (ch08) |
| `maison` | the family house | the brothers' little room with blue walls, two beds, the night table; the living room |
| `mami` | Mami's house, Bafoussam | the courtyard, the old sewing machine, the njangi of the women in blue and white pagne |
| `colline` | the hill road above Bafoussam | the slope, the cousins' pitch, the fog that becomes « du blanc partout » |
| `car` | the coach to Bafoussam | the seats, the windows, the bends |
| `waldorf` | Waldorf, Maryland (Part II) | the little beige house with its porch, the driveway with the car under its cap of snow and the hoop « dont le filet a gelé », the neighbours' houses, bare maples and pines, the street with the yellow school bus; option `field`: behind the school, the pitches gone under the snow, only the crossbars showing (« Les buts ont mis un chapeau blanc ») |
| `maisonUS` | the house in Waldorf | the basement (« une maison sous la maison »): the boiler that purrs like a big iron cat, the washing machine, the bare bulb on its wire that swings when the ball brushes it; up the stairs the living room and the kitchen |
| `classe` | the school | the classroom and Mrs. Patterson's small room: desks and chairs, the whiteboard where she draws a cooking pot and a hen, snow at the windows |
| `bus` | the yellow school bus home | green benches two by two, the ribbed black floor, Waldorf under the snow sliding past the windows |
| `gymnase` | the community centre | a parquet futsal court with painted lines, red and white futsal goals, high windows on the snow, the bench, the hot chocolate urn, the drinking fountain |
| `avion` | Douala airport and the plane | a polished hall that smells of fuel and coffee (a departures board, a coffee counter, the plane outside the glass), the cabin with the window seat; through the window the tin roofs and the Wouri, then the clouds close over the red earth |

Every surface texture is drawn in code (canvas): plaster, tin, earth, grass cards, wax prints. No
photographs, no stock images, no third-party textures.

## 4. Light

The light of a scene is a mood (`sets/common.ts`), chosen by the chapter's text:

| Mood | When | Character |
|---|---|---|
| `morning` | early day, the drums at dawn | white light with red dust, a rosy horizon |
| `noon` | midday | hard white sun, short shadows |
| `golden` | late afternoon matches | low orange sun, long shadows, warm haze |
| `evening` | after the final, the signatures | sunset orange to blue |
| `night` | the mango tree at night | moonlit blue, low fill |
| `rain`, `overcast` | chapter 4 | grey, wet, darker ground, rain particles |
| `fog`, `whiteout` | Bafoussam | from a few dozen metres to a few metres of visibility |
| `interior`, `interiorNight` | rooms, the plane | warm bounce by day, a single bulb by night |

Post-processing: a broadcast grade (contrast 1.06, saturation 1.08, soft vignette), bloom only on
genuinely bright things (threshold 1.45, so a yellow shirt never glows), ambient occlusion on the
high tier.

## 5. Camera language

- Dialogue at mid shot or closer (`on`), from the side the speakers face; seated characters framed
  at sitting height.
- Play is framed between the player and where the ball should go (`over` with a mix), so both the
  player and the target are on screen.
- Matches use the broadcast view (`match`) for flow, cuts to `follow` or a fixed `pose` for the key
  moment; slow motion only where the book slows time (« Tout ralentit »).
- Cuts are cuts: a character may be moved during a cut, never in view.

## 6. Interface

- Palette: the site's brand (night `#101814` backgrounds, cream text, forest green, terracotta,
  sun gold, clay red); speaker names take the character's colour from `cast.ts`.
- Type: Archivo (the site's display face), semibold for names, regular for subtitles; no all-caps
  except the book's own cries.
- The on-screen pad (`app/src/games/shared/Manette.tsx`) follows the familiar console layout: a stick
  on the left, four face buttons in a diamond on the right with what each one does right now written
  beside it, a sprint trigger. The glyphs (cross, circle, square, triangle) are simple monochrome
  shapes drawn in code; there is no console maker's logo, name or artwork anywhere. A real gamepad
  (standard mapping) drives the same actions and the pad shrinks to a legend.
- Touch targets at least 44 px; icons from lucide only; subtitles sit between the stick and the
  buttons on wide or landscape screens and above the pad on tall phones; reduced motion respected.

## 7. Sound

All effects are synthesised at runtime (`app/src/games/shared/audio.ts`): kicks, touches, the
whistle, the net, the post, thunder, mud, the big drums of the final (« Boum ! Boum ! Ba-da-boum ! »),
the plane's engines, a crowd or street ambience. No audio files, no voices: the book's words are read
on screen.

## 8. Quality tiers

| Tier | Pixel ratio | Shadows | Crowd | Post |
|---|---|---|---|---|
| low | 1 | off | 25 % | off |
| medium | 1.5 | 2048 px, two cascades | 60 % | grade and bloom |
| high | 2 | 4096 px, two cascades | 100 % | grade, bloom, ambient occlusion |

The tier is chosen from the device and saved (`localStorage` key `ndamba.jeux.quality`); the
settings panel lets the player change it, and the game drops a tier on its own if frames run slow
(`?hq` disables that for checks).

## 9. Sources and licences

- MakeHuman / MPFB2 data files (CC0): base mesh, targets, rig, weights. Only the data files are read.
- CMU Graphics Lab motion capture (cgspeed BVH conversion): free to use, retargeted by our script.
- Everything else (sets, props, textures, crowd, sound, the pad) is made in this repository.
- Chapter cards show the book's own illustrations (`/book/tome1/img/`).
