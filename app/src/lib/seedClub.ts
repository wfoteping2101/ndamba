// Club demo data (club space): the club around « Étoile de la Côte », called at the end of the pro demo seed.
// It writes the Club row, its members and three more teams of the same club (U19, U17 and the women's senior
// team), each with a small roster, three played matches coded with plausible counts and one upcoming match,
// a few club videos (match, training, scouting) and some recruitment profiles. Every name is invented.
// Event streams are built from exact counts per half, so the Indice Njangi of each match is known in advance
// (U19 around 57, U17 around 40 to 47, women around 63, the weak point of the club being Fixation).
import { db } from './db'
import type { Club, Clip, EventCode, GamePlan, Match, MatchEvent, Member, Player, SkillKey, Team, VideoProject, VideoTag } from './types'
import { addDays, nowISO, todayISO, weekStart } from './util'
import { formationSlots } from './formations'

type Lang = 'fr' | 'en'
type Counts = Partial<Record<EventCode, number>>
type Row = [name: string, number: number, position: string, birthYear: number, foot: 'R' | 'L' | 'B', base: number]

const SENIORS = 'team_etoile'
const T = { u19: 'team_etoile_u19', u17: 'team_etoile_u17', fem: 'team_etoile_fem' } as const
type TeamKey = keyof typeof T

/* ---------------- rosters: the starting eleven in 4-3-3 slot order (GK RB RCB LCB LB DM RCM LCM RW ST LW), then the bench ---------------- */

const ROSTERS: Record<TeamKey, Row[]> = {
  u19: [
    ['Fabrice Ewane', 1, 'GK', 2008, 'R', 2.8], ['Loïc Nguimbous', 2, 'FB', 2009, 'R', 2.7], ['Landry Nzouango', 4, 'CB', 2008, 'R', 2.9],
    ['Marius Owona', 5, 'CB', 2008, 'L', 3], ['Ibrahim Mfondi', 3, 'FB', 2008, 'L', 2.8], ['Ulrich Tchakounté', 6, 'DM', 2008, 'R', 3.1],
    ['Dimitri Fonkou', 8, 'CM', 2009, 'R', 2.9], ['Kevin Abessolo', 10, 'AM', 2008, 'L', 3.2], ['Yannick Eboa', 7, 'W', 2009, 'R', 2.9],
    ['Samuel Ngassa', 9, 'ST', 2008, 'R', 3.3], ['Oumarou Daïrou', 11, 'W', 2009, 'L', 3],
    ['Joël Meka', 12, 'CM', 2009, 'B', 2.6], ['Brandon Epée', 14, 'W', 2009, 'R', 2.7], ['Gaston Nyobe', 16, 'GK', 2009, 'R', 2.5],
  ],
  u17: [
    ['Hilaire Mekongo', 1, 'GK', 2010, 'R', 2.6], ['Jordan Kwedi', 2, 'FB', 2010, 'R', 2.5], ['Paulin Essono', 4, 'CB', 2010, 'R', 2.7],
    ['Frédéric Tagne', 5, 'CB', 2010, 'R', 2.6], ['Christian Abanda', 3, 'FB', 2011, 'L', 2.5], ['Nathan Mbella', 6, 'DM', 2010, 'R', 3.2],
    ['Rostand Fokou', 8, 'CM', 2011, 'R', 2.7], ['Aurélien Djomo', 10, 'AM', 2010, 'L', 2.9], ['Ousmane Bakari', 7, 'W', 2011, 'R', 2.6],
    ['Junior Ngono', 9, 'ST', 2010, 'R', 2.8], ['Patrick Edimo', 11, 'W', 2010, 'L', 2.7],
    ['Lucien Bekolo', 13, 'CM', 2011, 'R', 2.4], ['Didier Mendomo', 15, 'CB', 2011, 'L', 2.4],
  ],
  fem: [
    ['Carine Ngo Mbog', 1, 'GK', 1998, 'R', 3], ['Prisca Ewodo', 2, 'FB', 2001, 'R', 2.9], ['Sandrine Mvondo', 4, 'CB', 1997, 'R', 3.2],
    ['Ruth Ngo Bassong', 5, 'CB', 2000, 'R', 3], ['Laure Tchuente', 3, 'FB', 2003, 'L', 2.9], ['Grâce Ateba', 6, 'DM', 1999, 'R', 3.3],
    ['Vanessa Kenmogne', 8, 'CM', 2002, 'R', 3], ['Danielle Ebanga', 10, 'AM', 2004, 'L', 3.4], ['Fadimatou Hamadjoda', 7, 'W', 2005, 'R', 3],
    ['Josiane Ekeme', 9, 'ST', 2001, 'R', 3.1], ['Murielle Tsafack', 11, 'W', 2003, 'L', 2.9],
    ['Clarisse Biyong', 12, 'CM', 2006, 'R', 2.6], ['Nadège Mballa', 14, 'W', 2005, 'R', 2.7], ['Chantal Ngah', 16, 'GK', 2004, 'R', 2.6],
  ],
}
const pid = (k: TeamKey, n: number) => `pl_${k}_${n}`

const SKILLS: SkillKey[] = ['scan', 'controle', 'passe', 'conduite', 'dribble-njangi', 'appels', 'communication', 'protection', 'contre-pression', 'decision']
function skills(seed: number, base: number): Player['skills'] {
  const out: Player['skills'] = {}
  SKILLS.forEach((k, i) => { out[k] = Math.max(1, Math.min(4, Math.round(base + (((seed * 5 + i * 11) % 5) - 2) / 2))) as 1 | 2 | 3 | 4 })
  return out
}

/* ---------------- coded matches: exact counts per half ---------------- */

/** Counts of one half (us). Each played match scales the purposeful actions by a factor (the season improves). */
const HALF: Record<TeamKey, Counts> = {
  u19: { PASS_OK: 150, PASS_LOST: 32, PROG: 30, LINE: 12, FINAL3: 18, BOX: 7, FIX2: 3, SWITCH: 2, LOSS: 18, REGAIN5: 12, REGAIN: 20, SHOT: 7, SHOT_IN: 3 },
  u17: { PASS_OK: 116, PASS_LOST: 33, PROG: 21, LINE: 7, FINAL3: 13, BOX: 5, FIX2: 2, SWITCH: 1, LOSS: 19, REGAIN5: 9, REGAIN: 18, SHOT: 5, SHOT_IN: 2 },
  fem: { PASS_OK: 165, PASS_LOST: 30, PROG: 32, LINE: 13, FINAL3: 19, BOX: 8, FIX2: 4, SWITCH: 2, LOSS: 16, REGAIN5: 11, REGAIN: 17, SHOT: 7, SHOT_IN: 3 },
}
const PURPOSE: EventCode[] = ['PROG', 'LINE', 'FINAL3', 'BOX', 'FIX2', 'SWITCH', 'REGAIN5']
const WASTE: EventCode[] = ['PASS_LOST', 'LOSS']

/** Who tends to make each action, by position (relative weights). */
const WEIGHTS: Record<string, Partial<Record<string, number>>> = {
  pass: { GK: 0.45, CB: 1.25, FB: 1, DM: 1.45, CM: 1.3, AM: 1.1, W: 0.8, ST: 0.55 },
  prog: { GK: 0.1, CB: 0.8, FB: 0.9, DM: 1.3, CM: 1.4, AM: 1.2, W: 0.6, ST: 0.3 },
  final3: { FB: 0.8, DM: 0.2, CM: 0.8, AM: 1.2, W: 1.4, ST: 0.9 },
  box: { FB: 0.4, CM: 0.5, AM: 1, W: 1.2, ST: 1.4 },
  fix: { FB: 0.5, DM: 0.6, CM: 1, AM: 1.2, W: 1.3, ST: 0.4 },
  switch: { CB: 0.8, FB: 0.6, DM: 1.3, CM: 1.2, AM: 0.5 },
  loss: { CB: 0.2, FB: 0.6, DM: 0.4, CM: 0.6, AM: 1, W: 1.3, ST: 1.2 },
  regain5: { CB: 0.5, FB: 0.6, DM: 1.3, CM: 1.2, AM: 1, W: 0.9, ST: 0.9 },
  regain: { GK: 0.5, CB: 1.3, FB: 1, DM: 1.2, CM: 0.8, AM: 0.3, W: 0.3, ST: 0.2 },
  shot: { CB: 0.15, FB: 0.15, DM: 0.2, CM: 0.5, AM: 1, W: 1.2, ST: 1.6 },
}
const KIND: Partial<Record<EventCode, string>> = { PASS_OK: 'pass', PASS_LOST: 'pass', PROG: 'prog', LINE: 'prog', FINAL3: 'final3', BOX: 'box', FIX2: 'fix', SWITCH: 'switch', LOSS: 'loss', REGAIN5: 'regain5', REGAIN: 'regain', SHOT: 'shot', SHOT_IN: 'shot', GOAL: 'shot' }

interface PlayedSpec { id: string; factor: number; scoreUs: number; scoreThem: number; theirShots: [number, number]; sub: [minuteOfHalf2: number, off: number, on: number]; seed: number; scorers?: number[] }

/** The tag stream of one played match and the minutes of the substitution. */
function playedMatch(k: TeamKey, spec: PlayedSpec, players: Player[], halfMinutes: number) {
  let r = spec.seed
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 }
  const xi = ROSTERS[k].slice(0, 11).map((row) => pid(k, row[1]))
  const off = pid(k, spec.sub[1]), on = pid(k, spec.sub[2]), subAt = spec.sub[0] * 60
  const byId = new Map(players.map((p) => [p.id, p]))
  const onPitch = (half: 1 | 2, t: number) => xi.map((id) => (half === 2 && id === off && t >= subAt ? on : id)).map((id) => byId.get(id)).filter((p): p is Player => !!p)
  const pick = (half: 1 | 2, t: number, code: EventCode) => {
    const kind = KIND[code]
    const squad = onPitch(half, t)
    const w = squad.map((p) => (kind ? WEIGHTS[kind][p.position] ?? 0.05 : 1))
    let x = rnd() * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < squad.length; i++) { x -= w[i]; if (x <= 0) return squad[i].id }
    return squad[squad.length - 1]?.id
  }
  const len = halfMinutes * 60
  const out: MatchEvent[] = []
  const now = nowISO()
  let n = 0
  const push = (half: 1 | 2, t: number, code: EventCode, side: 'us' | 'them', playerId?: string) =>
    out.push({ id: `ev_${spec.id}_${++n}`, matchId: spec.id, half, t: Math.round(t), code, side, playerId: side === 'us' ? playerId ?? pick(half, t, code) : undefined, createdAt: now })
  for (const half of [1, 2] as const) {
    const base = HALF[k]
    for (const [code, v] of Object.entries(base) as [EventCode, number][]) {
      if (code === 'SHOT_IN') continue
      const f = PURPOSE.includes(code) ? spec.factor : WASTE.includes(code) ? 2 - spec.factor : 1
      const count = Math.max(0, Math.round(v * f + (half === 2 ? 0.4 : -0.4)))
      for (let i = 0; i < count; i++) push(half, 15 + rnd() * (len + 90), code, 'us')
    }
    // on target: some of the shots, same moment and same player
    const shots = out.filter((e) => e.half === half && e.code === 'SHOT' && e.side === 'us')
    for (const s of shots.slice(0, base.SHOT_IN ?? 0)) push(half, s.t, 'SHOT_IN', 'us', s.playerId)
    for (let i = 0; i < spec.theirShots[half - 1]; i++) push(half, 30 + rnd() * len, 'SHOT', 'them')
  }
  // goals: ours from shots on target when there are enough, theirs spread over the match
  const ins = out.filter((e) => e.code === 'SHOT_IN' && e.side === 'us')
  for (let g = 0; g < spec.scoreUs; g++) {
    const s = ins[Math.floor((g + 0.5) * ins.length / Math.max(1, spec.scoreUs))]
    const scorer = spec.scorers?.[g] != null ? pid(k, spec.scorers[g]) : undefined
    if (s) {
      // the named scorer takes the shot on target (and the shot itself) that the goal comes from
      if (scorer) {
        const shot = out.find((e) => e.code === 'SHOT' && e.side === 'us' && e.half === s.half && e.t === s.t && e.playerId === s.playerId)
        if (shot) shot.playerId = scorer
        s.playerId = scorer
      }
      push(s.half as 1 | 2, s.t + 1, 'GOAL', 'us', s.playerId)
    } else { const half = (g % 2 ? 2 : 1) as 1 | 2; push(half, 600 + rnd() * (len - 900), 'GOAL', 'us', scorer) }
  }
  for (let g = 0; g < spec.scoreThem; g++) { const half = (g % 2 ? 1 : 2) as 1 | 2; push(half, 300 + rnd() * (len - 400), 'GOAL', 'them') }
  out.sort((a, b) => a.half - b.half || a.t - b.t)
  const minutes: Record<string, number> = { [off]: halfMinutes + spec.sub[0], [on]: halfMinutes - spec.sub[0] }
  return { events: out, minutes, lineup: xi }
}

/* ---------------- the seed ---------------- */

export async function seedClub(lang: Lang): Promise<void> {
  const fr = lang === 'fr'
  const L = (a: string, b: string) => (fr ? a : b)
  const now = nowISO()
  const monday = weekStart(todayISO())
  const ids = Object.values(T) as string[]

  const club: Club = {
    id: 'club', name: 'Étoile de la Côte', city: 'Douala', country: L('Cameroun', 'Cameroon'), founded: 1987,
    colors: { primary: '#14506B', secondary: '#F5B700' },
    about: L('Club de Douala fondé en 1987 : une équipe en Ligue 1, une équipe féminine et deux équipes de jeunes qui jouent toutes le même football.',
      'A Douala club founded in 1987: a Ligue 1 side, a women\'s team and two youth teams who all play the same football.'),
    gameModel: L('Le ballon doit voyager, mais il doit savoir où il va. Toutes nos équipes jouent en 4-3-3 : sortie à trois depuis le gardien, un pivot entre les centraux, des latéraux hauts. À la perte, cinq secondes de contre-pression, puis un bloc médian compact. Nous voulons fixer d\'un côté pour attaquer de l\'autre : c\'est le point que chaque équipe travaille cette saison.',
      'The ball must travel, but it must know where it is going. All our teams play a 4-3-3: build up with three from the keeper, a pivot between the centre-backs, high full-backs. When we lose it, five seconds of counter-press, then a compact mid block. We want to draw them to one side to attack the other: the point every team is working on this season.'),
    publicProfiles: true, createdAt: now,
  }

  const TEAMS: Record<TeamKey, Team> = {
    u19: { id: T.u19, name: 'Étoile de la Côte U19', ageGroup: 'U19', format: 11, formation: '4-3-3', colors: club.colors, createdAt: now },
    u17: { id: T.u17, name: 'Étoile de la Côte U17', ageGroup: 'U17', format: 11, formation: '4-3-3', colors: club.colors, createdAt: now },
    fem: { id: T.fem, name: L('Étoile de la Côte, féminines', 'Étoile de la Côte women'), ageGroup: 'Seniors', format: 11, formation: '4-3-3', colors: club.colors, createdAt: now },
  }
  const players: Player[] = (Object.keys(ROSTERS) as TeamKey[]).flatMap((k) => ROSTERS[k].map(([name, number, position, birthYear, foot, base], i) => ({
    id: pid(k, number), teamId: T[k], name, number, position, birthYear, foot, skills: skills(i + 2, base), createdAt: now,
  })))

  const plan: GamePlan = fr
    ? { possession: 'Sortie à trois, le pivot entre les centraux. Fixer à gauche, renverser vers l\'ailier droit.', transitionDef: 'Cinq secondes de contre-pression, défense de repos à 3 + 2.', defense: 'Bloc médian en 4-1-4-1, pressing sur la passe vers leur latéral.', transitionOff: 'Premier regard vers l\'avant-centre en profondeur.', setPieces: 'Corners rentrants au premier poteau.' }
    : { possession: 'Build up with three, the pivot between the centre-backs. Draw them left, switch to the right winger.', transitionDef: 'Five seconds of counter-press, rest defence 3 + 2.', defense: 'Mid block in a 4-1-4-1, press on the pass to their full-back.', transitionOff: 'First look for the striker in behind.', setPieces: 'Inswinging corners to the near post.' }
  const slots = formationSlots(11, '4-3-3')
  const home = L('Stade de l\'Étoile, Douala', 'Étoile stadium, Douala')
  const annex = L('Terrain annexe de l\'Étoile, Douala', 'Étoile training ground, Douala')

  // [id, offset from Monday, opponent, home, competition, venue when away, spec when played]
  type Fixture = [string, number, string, boolean, string, string, Omit<PlayedSpec, 'id'> | null]
  const FIXTURES: Record<TeamKey, { halfMinutes: number; time: string; captain: number; list: Fixture[] }> = {
    u19: { halfMinutes: 45, time: '10:00', captain: 6, list: [
      ['ma_u19_1', -15, 'Lions de Mbanga U19', true, L('Championnat régional U19, journée 4', 'Regional U19 league, matchday 4'), '', { factor: 0.92, scoreUs: 1, scoreThem: 1, theirShots: [4, 5], sub: [20, 7, 14], seed: 31, scorers: [9] }],
      ['ma_u19_2', -8, 'Espoirs d\'Édéa U19', false, L('Championnat régional U19, journée 5', 'Regional U19 league, matchday 5'), L('Stade municipal d\'Édéa', 'Édéa municipal stadium'), { factor: 1, scoreUs: 3, scoreThem: 1, theirShots: [3, 4], sub: [25, 11, 14], seed: 47, scorers: [9, 10, 9] }],
      ['ma_u19_3', -1, 'Avenir du Mungo U19', true, L('Championnat régional U19, journée 6', 'Regional U19 league, matchday 6'), '', { factor: 1.06, scoreUs: 2, scoreThem: 2, theirShots: [5, 4], sub: [18, 8, 12], seed: 59, scorers: [7, 9] }],
      ['ma_u19_next', 6, 'Jeunesse de Loum U19', false, L('Championnat régional U19, journée 7', 'Regional U19 league, matchday 7'), L('Terrain de Loum', 'Loum pitch'), null],
    ] },
    u17: { halfMinutes: 40, time: '09:00', captain: 6, list: [
      ['ma_u17_1', -16, 'Aigles de Kumba U17', true, L('Tournoi régional U17', 'Regional U17 tournament'), '', { factor: 0.9, scoreUs: 0, scoreThem: 2, theirShots: [5, 6], sub: [15, 7, 13], seed: 23 }],
      ['ma_u17_2', -9, 'Cadets de Buéa U17', false, L('Tournoi régional U17', 'Regional U17 tournament'), L('Stade de Buéa', 'Buéa stadium'), { factor: 1, scoreUs: 1, scoreThem: 1, theirShots: [4, 4], sub: [20, 4, 15], seed: 37, scorers: [9] }],
      ['ma_u17_3', -2, 'Racines de Nkongsamba U17', true, L('Tournoi régional U17', 'Regional U17 tournament'), '', { factor: 1.12, scoreUs: 2, scoreThem: 1, theirShots: [3, 4], sub: [22, 11, 13], seed: 53, scorers: [10, 9] }],
      ['ma_u17_next', 5, 'Lions de Mbanga U17', false, L('Tournoi régional U17', 'Regional U17 tournament'), L('Stade de Mbanga', 'Mbanga stadium'), null],
    ] },
    fem: { halfMinutes: 45, time: '15:00', captain: 4, list: [
      ['ma_fem_1', -22, 'Gazelles d\'Ebolowa', true, L('Ligue féminine, journée 5', 'Women\'s league, matchday 5'), '', { factor: 1, scoreUs: 2, scoreThem: 0, theirShots: [3, 3], sub: [24, 7, 14], seed: 29, scorers: [10, 9] }],
      ['ma_fem_2', -15, 'Colombes de Bertoua', false, L('Ligue féminine, journée 6', 'Women\'s league, matchday 6'), L('Stade de Bertoua', 'Bertoua stadium'), { factor: 0.94, scoreUs: 1, scoreThem: 2, theirShots: [5, 5], sub: [15, 11, 14], seed: 41, scorers: [9] }],
      ['ma_fem_3', -8, 'Panthères de Dschang', true, L('Ligue féminine, journée 7', 'Women\'s league, matchday 7'), '', { factor: 1.05, scoreUs: 3, scoreThem: 1, theirShots: [3, 4], sub: [20, 8, 12], seed: 61, scorers: [9, 10, 7] }],
      ['ma_fem_next', 6, 'Lionnes de Mbalmayo', false, L('Ligue féminine, journée 8', 'Women\'s league, matchday 8'), L('Stade de Mbalmayo', 'Mbalmayo stadium'), null],
    ] },
  }

  const matches: Match[] = []
  const events: MatchEvent[] = []
  for (const k of Object.keys(FIXTURES) as TeamKey[]) {
    const fx = FIXTURES[k]
    const xi = ROSTERS[k].slice(0, 11).map((row) => pid(k, row[1]))
    const bench = ROSTERS[k].slice(11).map((row) => pid(k, row[1]))
    for (const [id, off, opponent, isHome, competition, awayVenue, spec] of fx.list) {
      const m: Match = {
        id, teamId: T[k], opponent, date: addDays(monday, off), time: fx.time, venue: isHome ? (k === 'fem' ? home : annex) : awayVenue, home: isHome, competition,
        format: 11, formation: '4-3-3', halfMinutes: fx.halfMinutes, lineup: slots.map((s, i) => ({ slot: s.id, playerId: xi[i] })), subs: bench,
        captainId: pid(k, fx.captain), plan, status: spec ? 'done' : 'planned', scoreUs: spec?.scoreUs ?? 0, scoreThem: spec?.scoreThem ?? 0, createdBy: 'user', createdAt: now,
      }
      if (spec) {
        const p = playedMatch(k, { id, ...spec }, players, fx.halfMinutes)
        m.minutes = p.minutes
        events.push(...p.events)
      }
      matches.push(m)
    }
  }

  // The U19 match at Édéa was coded on its video: each action keeps its moment in the film.
  const U19_K2 = 30 + 45 * 60 + 120 + 900
  for (const e of events) if (e.matchId === 'ma_u19_2') e.videoT = e.half === 1 ? 30 + e.t : U19_K2 + e.t
  const goalOf = (matchId: string, playerId: string) => events.find((e) => e.matchId === matchId && e.code === 'GOAL' && e.side === 'us' && e.playerId === playerId)
    ?? events.find((e) => e.matchId === matchId && e.code === 'GOAL' && e.side === 'us')
  const regainOf = (matchId: string, playerId: string) => events.find((e) => e.matchId === matchId && e.code === 'REGAIN5' && e.playerId === playerId)
  const g19 = goalOf('ma_u19_2', pid('u19', 9))
  const r19 = regainOf('ma_u19_2', pid('u19', 9))
  const vt = (e?: MatchEvent) => (e ? (e.videoT ?? (e.half === 1 ? 30 + e.t : U19_K2 + e.t)) : 600)

  const clip = (id: string, start: number, end: number, title: [string, string], note: [string, string] | null, playerIds: string[] = []): Clip =>
    ({ id, start: Math.max(0, Math.round(start)), end: Math.round(end), title: L(...title), note: note ? L(...note) : undefined, playerIds, createdAt: now })
  const note = (id: string, t: number, text: [string, string]): VideoTag => ({ id, t, code: 'NOTE', side: 'us', note: L(...text) })
  const at = (offset: number) => new Date(`${addDays(monday, offset)}T19:00:00`).toISOString() // an evening of that day, local time

  const videos: VideoProject[] = [
    {
      id: 'vp_club_u19', title: L('U19 contre Espoirs d\'Édéa U19', 'U19 v Espoirs d\'Édéa U19'), source: 'file', fileName: 'u19-espoirs-edea.mp4',
      matchId: 'ma_u19_2', teamId: T.u19, kind: 'match', duration: U19_K2 + 45 * 60 + 150, kickoff1: 30, kickoff2: U19_K2, tags: [],
      clips: [
        clip('cl_u19_goal', vt(g19) - 14, vt(g19) + 5, ['Ngassa : appel dans le dos et but', 'Ngassa: run in behind and goal'], ['L\'appel part au moment où le pivot lève la tête.', 'The run starts the moment the pivot looks up.'], [pid('u19', 9)]),
        clip('cl_u19_press', vt(r19) - 8, vt(r19) + 5, ['Ngassa : contre-pression et reprise', 'Ngassa: counter-press and regain'], null, [pid('u19', 9)]),
        clip('cl_u19_build', 30 + 9 * 60, 30 + 9 * 60 + 22, ['Sortie à trois sous pression', 'Build-up with three under pressure'], ['Tchakounté décroche entre les centraux.', 'Tchakounté drops between the centre-backs.'], [pid('u19', 6)]),
      ],
      createdAt: at(-8),
    },
    {
      id: 'vp_club_u17_training', title: L('U17, séance de mardi : sortie de balle', 'U17, Tuesday session: build-up play'), source: 'file', fileName: 'u17-seance-sortie.mp4',
      teamId: T.u17, kind: 'training', duration: 1820,
      tags: [note('tg_u17_1', 240, ['Bon décrochage de Mbella, mais il reçoit dos au jeu.', 'Good drop from Mbella, but he receives facing his own goal.']), note('tg_u17_2', 905, ['Les latéraux restent trop bas : personne pour fixer.', 'Full-backs stay too deep: no one to draw the opponent.'])],
      clips: [clip('cl_u17_mbella', 228, 252, ['Mbella : orientation du corps avant la passe', 'Mbella: body shape before the pass'], ['Il ouvre les hanches et joue vers l\'avant en une touche.', 'He opens his hips and plays forward first time.'], [pid('u17', 6)])],
      createdAt: at(-6),
    },
    {
      id: 'vp_club_fem', title: L('Féminines contre Gazelles d\'Ebolowa', 'Women v Gazelles d\'Ebolowa'), source: 'file', fileName: 'feminines-gazelles.mp4',
      matchId: 'ma_fem_1', teamId: T.fem, kind: 'match', duration: 5960, tags: [],
      clips: [
        clip('cl_fem_ebanga', 1410, 1432, ['Ebanga : passe entre les lignes', 'Ebanga: pass between the lines'], ['Elle attend que leur milieu sorte, puis trouve l\'appel d\'Ekeme.', 'She waits for their midfielder to step out, then finds Ekeme\'s run.'], [pid('fem', 10), pid('fem', 9)]),
        clip('cl_fem_ebanga2', 4120, 4141, ['Ebanga : frappe du gauche', 'Ebanga: left-footed strike'], null, [pid('fem', 10)]),
      ],
      createdAt: at(-22),
    },
    {
      id: 'vp_club_scout_kribi', title: L('Observation : Rapides de Kribi, sorties de balle', 'Scouting: Rapides de Kribi, build-up'), source: 'file', fileName: 'rapides-kribi-observation.mp4',
      teamId: SENIORS, kind: 'scouting', opponent: 'Rapides de Kribi', duration: 2460,
      tags: [note('tg_sc_1', 312, ['Leur pivot décroche toujours à gauche : fermer cette ligne de passe.', 'Their pivot always drops to the left: close that passing lane.']), note('tg_sc_2', 1490, ['Latéral droit très haut : espace dans son dos pour Nana.', 'Right-back pushes very high: space behind him for Nana.'])],
      clips: [
        clip('cl_sc_pivot', 300, 326, ['Leur sortie : le pivot à gauche', 'Their build-up: the pivot drops left'], null),
        clip('cl_sc_space', 1478, 1500, ['L\'espace dans le dos du latéral droit', 'The space behind their right-back'], null),
      ],
      createdAt: at(-3),
    },
    {
      id: 'vp_club_scout_loum', title: L('Observation : Jeunesse de Loum U19', 'Scouting: Jeunesse de Loum U19'), source: 'file', fileName: 'loum-u19-observation.mp4',
      teamId: T.u19, kind: 'scouting', opponent: 'Jeunesse de Loum U19', duration: 1980,
      tags: [note('tg_lo_1', 640, ['Pressing très haut à la relance : jouer long sur Ngassa.', 'Very high press on goal kicks: go long to Ngassa.'])],
      clips: [], createdAt: at(-4),
    },
  ]

  const members: Member[] = [
    { id: 'mb_k7q2x9ad', name: 'Albert Kotto', role: 'admin', teamIds: [SENIORS, ...ids], status: 'active', createdAt: now },
    { id: 'mb_d4m8b2ar', name: 'Daniel Mbarga', role: 'coach', teamIds: [SENIORS], status: 'active', createdAt: now },
    { id: 'mb_e3k9n5gq', name: 'Emmanuel Kingue', role: 'coach', teamIds: [T.u19], status: 'active', createdAt: now },
    { id: 'mb_a8b3o6te', name: 'Alain Ebogo', role: 'coach', teamIds: [T.u17], status: 'active', createdAt: now },
    { id: 'mb_s5m2g7nx', name: 'Sylvie Mengue', role: 'coach', teamIds: [T.fem], status: 'active', createdAt: now },
    { id: 'mb_b9n4g1le', name: 'Boris Nguele', role: 'analyst', teamIds: [SENIORS, T.u19], status: 'active', createdAt: now },
    { id: 'mb_s2n6d8jk', name: 'Steve Ndjock', role: 'player', teamIds: [SENIORS], playerId: 'pl_8', status: 'active', createdAt: now },
    { id: 'mb_m6b1e4lb', name: 'Marthe Mbella', role: 'parent', teamIds: [T.u17], playerId: pid('u17', 6), status: 'invited', email: 'marthe.mbella@example.com', invitedAt: addDays(todayISO(), -3), createdAt: now },
    { id: 'mb_k1t7m3bv', name: 'Kevin Tamba', role: 'analyst', teamIds: [T.fem], status: 'invited', email: 'kevin.tamba@example.com', invitedAt: addDays(todayISO(), -1), createdAt: now },
  ]

  // Recruitment profiles: some complete and public, some started, the rest empty.
  const recruit: Record<string, Player['recruit']> = {
    [pid('u19', 9)]: { public: true, heightCm: 181, highlightClipIds: ['vp_club_u19:cl_u19_goal', 'vp_club_u19:cl_u19_press'], bio: L('Avant-centre de 18 ans, rapide dans les appels en profondeur et premier défenseur de l\'équipe. Meilleur buteur des U19 cette saison. Cherche une académie ou une bourse d\'études-sport pour 2027.', '18-year-old centre-forward, quick to run in behind and the team\'s first defender. Top scorer of the U19 this season. Looking for an academy or a sports scholarship for 2027.') },
    [pid('u19', 10)]: { public: false, heightCm: 172, bio: L('Milieu gaucher, joue entre les lignes.', 'Left-footed midfielder, plays between the lines.') },
    [pid('u17', 6)]: { public: true, heightCm: 176, highlightClipIds: ['vp_club_u17_training:cl_u17_mbella'], bio: L('Pivot de 16 ans, capitaine des U17. Oriente bien son corps avant de recevoir et cherche toujours la passe vers l\'avant.', '16-year-old holding midfielder, captain of the U17. Sets his body well before receiving and always looks for the forward pass.') },
    [pid('fem', 10)]: { public: true, heightCm: 165, highlightClipIds: ['vp_club_fem:cl_fem_ebanga', 'vp_club_fem:cl_fem_ebanga2'], bio: L('Milieu offensive gauchère de 22 ans. Voit la passe entre les lignes avant tout le monde, frappe de loin. Ouverte à un projet en première division.', '22-year-old left-footed attacking midfielder. Sees the pass between the lines before anyone else, shoots from distance. Open to a top-flight project.') },
    pl_17: { public: true, heightCm: 178, highlightClipIds: ['vp_demo_past:cl_demo_g3'], bio: L('Ailier droit de 22 ans, entré à la 66e contre Bafoussam pour marquer le but de la victoire. Accélère dans l\'espace laissé par le latéral adverse.', '22-year-old right winger, came on at the 66th minute against Bafoussam to score the winner. Accelerates into the space left by the opposing full-back.') },
    pl_9: { public: false, highlightClipIds: ['vp_demo_past:cl_demo_g1'] },
  }
  for (const p of players) if (recruit[p.id]) p.recruit = recruit[p.id]

  await db.transaction('rw', [db.club, db.members, db.teams, db.players, db.matches, db.events, db.videos], async () => {
    // idempotent: replace what a previous run wrote
    await Promise.all([db.club.clear(), db.members.clear()])
    const oldMatches = await db.matches.where('teamId').anyOf(ids).primaryKeys()
    if (oldMatches.length) await db.events.where('matchId').anyOf(oldMatches as string[]).delete()
    await db.matches.where('teamId').anyOf(ids).delete()
    await db.players.where('teamId').anyOf(ids).delete()
    await db.teams.bulkDelete(ids)
    await db.videos.bulkDelete(videos.map((v) => v.id))

    await db.club.put(club)
    await db.members.bulkPut(members)
    // created a moment after the seniors, so the team order stays seniors, U19, U17, women
    const base = Date.now()
    await db.teams.bulkPut([TEAMS.u19, TEAMS.u17, TEAMS.fem].map((tm, i) => ({ ...tm, createdAt: new Date(base + (i + 1) * 1000).toISOString() })))
    await db.players.bulkPut(players)
    await db.matches.bulkPut(matches)
    await db.events.bulkPut(events)
    await db.videos.bulkPut(videos)
    for (const id of ['pl_17', 'pl_9']) if (await db.players.get(id)) await db.players.update(id, { recruit: recruit[id] })
  })
}
