# Ndamba design system (October 2026 redesign)

William's verdict on the first version: "it seems like you just rushed to design the site", "I hated the icon" (the generic sparkle used for Mola), "stop including anything that makes the app seem rushed and cheap", "even the logo Ndamba needs to be well designed". This document is the answer. Every screen of the app and the site must follow it.

## 1. Who it is for, what it must feel like

Ndamba is a premium football tool from Cameroon for players, coaches, analysts, clubs and federations, from academies to professional senior teams. It must feel like the dressing room of a serious club: confident, exact, warm, African without folklore. Think of a well-cut national team kit and a coach's tactical board, not a startup template.

## 2. The brand assets (src/ui/brand.tsx, never redraw them)

- **NdambaMark**: the ball whose centre panel is the gold five-point star (the star of the Lions; the five pieces of the Njangi). Use `tone="color"` on light backgrounds, `tone="light"` on green or dark backgrounds.
- **NdambaWordmark** and **NdambaLogo** (mark + wordmark lockup, sizes sm, md, lg). The wordmark is outlined Archivo Expanded ExtraBold, lowercase « ndamba ». Never type the brand name in a font to fake the logo; never recolour the star.
- **MolaMark**: Mola's sign, the letter M drawn as a passing move (four players, four passes, the gold ball arrives). It replaces every sparkle, wand or magic icon. Use it wherever Mola acts: « Commencer avec Mola », « Préparer avec Mola », badges « Créé par Mola », the Mola nav item, empty states that offer Mola's help. Inline it like a lucide icon: `<MolaMark size={18} aria-hidden="true" />` (strokes take `currentColor`, the ball is gold; on a gold button pass `ball="#0B5D3B"`).
- **MolaAvatar** (badge, via `surfaces/mola/components/MolaAvatar.tsx`): Mola's face in chat, launcher and onboarding.
- Icons: lucide is allowed for plain UI actions (arrows, calendar, edit, close), at 1.75 stroke, sized with the text. Never use Sparkles, WandSparkles, Wand2, Stars, Bot, BrainCircuit or any "AI" glyph.
- App icons, favicon and the share image are in `public/icons/` and `public/favicon.svg`.

## 3. Colour (tailwind tokens keep their old names, the values changed)

| Token | Value | Role |
|---|---|---|
| `cream` (chalk) | `#F6F7F2` | app and site background (cool chalk, not beige) |
| `paper` | `#FFFFFF` | cards, panels, inputs |
| `sand` (mist) | `#ECEFE8` | quiet fills, selected rows, chips at rest |
| `line` | `#DCE2D8` | hairlines |
| `ink` | `#12211A`, soft `#34443B`, muted `#5D6C63`, faint `#94A198` | text |
| `forest` (pitch) | 600 `#0B5D3B` brand, 500 `#13804F`, 700 `#084B30`, 800 `#063A25`, 50 `#E8F3ED` | primary actions, brand surfaces, links |
| `sun` (star gold) | 500 `#F5B700`, 300 `#FFD452`, 50 `#FFF8DD` | the one highlight colour: the main CTA, the ball, live states |
| `clay` (kola red) | 500 `#D7263D` | errors, recording, destructive actions only |
| `terra` (red earth) | 500 `#BF5A2E` | rare: the red earth of Douala in illustrations and the youth space, never for labels |
| `night` | 800 `#0A2117` | deep pitch at night for dark heroes and the live tagger |

Rules: one gold accent per view at most (the main action or the key number). Green carries the brand. Red only means danger or live recording. No gradients as decoration (a single soft radial light on a dark hero is the maximum). No beige, no terracotta labels.

## 4. Type (Archivo, self-hosted, variable width)

- One family: **Archivo** (`font-sans` and `font-display` both point to it).
- Display (h1, h2, h3, `.font-display`): width 116 percent, weight about 780, tight tracking (base styles in `index.css`). This is the personality of the brand: wide, athletic lettering like a kit. Use it for page titles, section titles, key numbers.
- Text: width 100 percent, weight 400, 15 to 17 px, line height 1.5 to 1.6, lines under 80 characters.
- Labels: sentence case, 13 px, weight 600, `ink-muted` or `forest-600`. **No all-caps labels and no letter-spaced uppercase anywhere** (the `.eyebrow` class is now sentence case; remove inline `uppercase tracking-[...]`). Exception: two- or three-letter codes that are uppercase by nature (MD-1, U17, FR, EN, team abbreviations).
- Numbers: `.num` or `tabular-nums` for scores, minutes, percentages, the Indice Njangi.
- Quotes and mottos: Archivo italic, not a serif.

## 5. Layout and components

- Hierarchy through size and space, not through boxes. Do not chop every section into identical cards. A page has one main block; secondary content sits on the background with a title, or in a single grouped panel with dividers.
- Radius by role: 22 px for large panels and heroes, 14 px for cards, 12 px for buttons and inputs, full for chips and avatars. Not the same radius on everything.
- Shadows: almost none. `shadow-card` is now a hairline; use `shadow-lift` only for floating things (menus, the Mola launcher, dialogs).
- Buttons: primary = pitch green with white text; the single main CTA of a screen may be gold with ink text and the MolaMark when Mola does the work; secondary = outline; tertiary = ghost. Text says exactly what happens (« Préparer la semaine », not « Valider »). No arrow characters appended to text.
- Empty states: one sentence that says what to do and one button. No mascot, no emoji.
- Forms: labels above fields in sentence case, helper text in `ink-muted`.
- Data: tables with sentence-case headers, tabular numbers, right-aligned numbers.

## 6. Writing (FR first, EN second)

- No meta strings joined with middle dots (« Ndamba · Le football avec intention »): write a sentence or use layout.
- No eyebrow above every heading. Keep a small label only when it carries information (the category of a card, a status, a date).
- No numbered markers (01, 02, 03) unless the content is a real sequence.
- No em or en dashes.
- No emoji in the interface.

## 7. Motion

One meaningful motion per screen at most (the Mola ring while Mola works, the ball travelling on the landing pitch). Respect `prefers-reduced-motion`. No fade-up on every section, no hover lift on every card.

## 8. Quality floor (check before you call a screen done)

- 390 px and 1280 px wide, no horizontal scroll, touch targets at least 44 px.
- Keyboard focus visible (green outline from `index.css`).
- Contrast AA for text; gold text only on dark backgrounds.
- FR and EN both read naturally and fit.
- Screenshot every screen you touch and look at it before moving on.
