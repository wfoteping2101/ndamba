// Demo history for the Parcours (player journey). Called at the end of seedDemo, for whichever demo team
// the browser holds (the Lionceaux U13 or the professional club): a season of sessions with attendance,
// dated evaluations (one from last season too), observations, objectives and milestones, and, for the
// youth team, three earlier matches with tags and playing time. Every date is relative to today, so the
// demo stays alive. Notes avoid pronouns so they read right for every player.
import { db } from './db'
import { buildBlocks } from './actions'
import { formationSlots } from './formations'
import { addDays, nowISO, todayISO, uid, weekStart } from './util'
import { ageOf, attendanceId, seasonOf, SKILL_KEYS, type Level, type Skills } from './journey'
import type {
  Attendance, AttendanceStatus, Evaluation, EventCode, Match, MatchEvent, MD, Milestone, NjangiSub, Objective, Observation, ObsTone,
  Player, Session, SkillKey, Team,
} from './types'

type L = 'fr' | 'en'
type Pair = [string, string]

function rng(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  let a = h >>> 0
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length]

/* ---------------- words ---------------- */

const OBS_NOTES: Record<SkillKey, Record<ObsTone, Pair>> = {
  scan: { plus: ['Lève la tête avant chaque réception, même quand ça presse.', 'Head up before every first touch, even under pressure.'], work: ['Reçoit encore sans avoir regardé : à travailler dans les rondos.', 'Still receives without a look: work on it in the rondos.'] },
  controle: { plus: ["Contrôle orienté vers l'espace libre, le jeu repart tout de suite.", 'Oriented first touch into space, the play moves on at once.'], work: ['Contrôle souvent arrêté, le pressing a le temps d\'arriver.', 'First touch often stops the ball, the press has time to arrive.'] },
  passe: { plus: ['Passe qui casse la ligne du milieu, sur le bon pied du partenaire.', 'Pass through the midfield line, onto the right foot.'], work: ['Joue en arrière par sécurité alors que la ligne était ouverte.', 'Plays backwards for safety when the line was open.'] },
  conduite: { plus: ['Conduite tête levée qui fait sortir un défenseur, puis donne.', 'Carries with the head up, draws a defender out, then releases.'], work: ['Conduite tête baissée, le ballon s\'éloigne du pied dans le trafic.', 'Carries with the head down, the ball runs away in traffic.'] },
  'dribble-njangi': { plus: ['Ose le un contre un et attire deux adversaires avant de donner.', 'Takes players on and draws two of them before passing.'], work: ['Dribble sans voir les partenaires libres.', 'Dribbles without seeing the free teammates.'] },
  appels: { plus: ["Appel dans le dos qui libère l'espace pour le partenaire.", 'Run in behind that frees space for a teammate.'], work: ['Reste immobile quand le ballon est de l\'autre côté.', 'Stands still when the ball is on the other side.'] },
  communication: { plus: ['Guide la défense de repos à la voix, au bon moment.', 'Organises the rest defence by voice, at the right moment.'], work: ['Joue en silence : demander le ballon, annoncer « Seul ! ».', 'Plays in silence: call for the ball, shout “Time!”.'] },
  protection: { plus: ['Garde le ballon dos au but sous la pression de deux adversaires.', 'Shields the ball with back to goal against two opponents.'], work: ['Perd le ballon au premier contact : travailler les appuis.', 'Loses the ball at the first contact: work on the stance.'] },
  'contre-pression': { plus: ['Réagit tout de suite à la perte : ballon repris en moins de 5 secondes.', 'Reacts at once to the loss: ball won back inside 5 seconds.'], work: ['S\'arrête après la perte au lieu de presser tout de suite.', 'Stops after losing the ball instead of pressing at once.'] },
  decision: { plus: ['Choix rapides et justes : la passe simple quand il le faut, l\'accélération quand l\'espace s\'ouvre.', 'Quick, sound choices: the simple pass when needed, the burst when space opens.'], work: ['Se précipite sous pression : prendre le temps d\'un contrôle.', 'Rushes under pressure: take the time for a touch.'] },
}
const SKILL_TAG: Partial<Record<SkillKey, Record<ObsTone, string | undefined>>> = {
  scan: { plus: 'head-up', work: 'head-down' }, passe: { plus: 'forward', work: 'backwards' }, appels: { plus: 'free-run', work: 'static' },
  'contre-pression': { plus: 'react-loss', work: 'stops-loss' }, 'dribble-njangi': { plus: 'dares', work: undefined }, communication: { plus: 'guides', work: 'silent' },
  protection: { plus: undefined, work: 'loses-contact' }, decision: { plus: undefined, work: 'rushed' },
}
const OBJ_SKILL: Record<SkillKey, Pair> = {
  scan: ['Regarder avant chaque réception, même sous pression', 'Check before every first touch, even under pressure'],
  controle: ["Orienter son contrôle des deux pieds vers l'espace libre", 'Open up with the first touch, on both feet'],
  passe: ['Choisir la passe qui casse une ligne quand elle est ouverte', 'Pick the line-breaking pass when it is on'],
  conduite: ['Conduire tête levée pour attirer, puis donner', 'Carry with the head up to draw, then release'],
  'dribble-njangi': ['Attirer deux adversaires avant de donner', 'Draw two opponents before passing'],
  appels: ['Faire un appel qui libère un partenaire à chaque possession', 'Make one run per possession that frees a teammate'],
  communication: ['Annoncer « Seul ! », « Homme ! », « Tourne ! » à chaque séance', 'Call “Time!”, “Man on!”, “Turn!” in every session'],
  protection: ["Garder le ballon dos au but sous la pression d'un adversaire", 'Keep the ball with back to goal under pressure'],
  'contre-pression': ['Presser dans les 5 secondes après chaque perte', 'Press within 5 seconds after every loss'],
  decision: ['Nommer son intention après chaque action en petit jeu', 'Name the intention after each action in small-sided games'],
}
const OBJ_SUB: Record<NjangiSub, Pair> = {
  progression: ['Jouer vers l\'avant : une passe ou une conduite qui progresse à chaque possession', 'Play forward: one progressive pass or carry per possession'],
  penetration: ['Entrer dans la surface au moins trois fois par match', 'Get into the box at least three times per match'],
  fixation: ['Fixer deux adversaires, puis renverser', 'Draw two opponents, then switch'],
  reprise: ['Reprendre le ballon en 5 secondes après la perte', 'Win the ball back within 5 seconds after a loss'],
  controle: ['Garder le ballon : 85 passes réussies sur 100', 'Keep the ball: 85 successful passes out of 100'],
}
const REVIEW: Record<'achieved' | 'partial' | 'notyet', Pair> = {
  achieved: ["Objectif atteint : c'est devenu un réflexe en match.", 'Achieved: it has become a reflex in matches.'],
  partial: ['En bonne voie : régulier en séance, pas encore en match.', 'On the way: regular in training, not yet in matches.'],
  notyet: ['Pas encore : on garde l\'objectif pour le cycle suivant.', 'Not yet: we keep it for the next cycle.'],
}
const EVAL_NOTES: Pair[] = [
  ['Évaluation croisée sur trois séances et un match.', 'Cross-checked over three sessions and a match.'],
  ['Progrès nets dans les petits jeux, à confirmer en match.', 'Clear progress in small-sided games, to confirm in matches.'],
  ['Reprise après les vacances : niveau retrouvé vite.', 'Back from the break: level found again quickly.'],
]
const SUB_FOR_POS: Record<string, NjangiSub> = { GK: 'controle', CB: 'progression', FB: 'progression', DM: 'reprise', CM: 'fixation', AM: 'fixation', W: 'penetration', ST: 'penetration' }

/* ---------------- tag streams for the youth team's earlier matches ---------------- */

const W: Record<string, Record<string, number>> = {
  pass: { GK: 0.4, CB: 1.2, FB: 1, DM: 1.5, CM: 1.3, AM: 1.1, W: 0.8, ST: 0.6 },
  prog: { GK: 0.1, CB: 0.8, FB: 0.9, DM: 1.3, CM: 1.4, AM: 1.2, W: 0.7, ST: 0.3 },
  att: { GK: 0, CB: 0.1, FB: 0.6, DM: 0.3, CM: 0.8, AM: 1.2, W: 1.4, ST: 1.4 },
  fix: { GK: 0, CB: 0.2, FB: 0.5, DM: 0.7, CM: 1, AM: 1.2, W: 1.3, ST: 0.4 },
  loss: { GK: 0.1, CB: 0.3, FB: 0.6, DM: 0.5, CM: 0.7, AM: 1, W: 1.3, ST: 1.2 },
  regain: { GK: 0.3, CB: 1.3, FB: 1, DM: 1.4, CM: 1, AM: 0.6, W: 0.6, ST: 0.5 },
}
const KIND: Partial<Record<EventCode, string>> = { PASS_OK: 'pass', PASS_LOST: 'pass', PROG: 'prog', LINE: 'prog', FINAL3: 'att', BOX: 'att', SHOT: 'att', SHOT_IN: 'att', FIX2: 'fix', SWITCH: 'fix', LOSS: 'loss', REGAIN5: 'regain', REGAIN: 'regain' }

interface HistMatch { id: string; opponent: Pair; offset: number; home: boolean; round: number; xi: string[]; bench: string[]; subs: [number, string, string][]; goals: { half: 1 | 2; t: number; side: 'us' | 'them'; playerId?: string }[]; seed: number }

function histEvents(m: HistMatch, halfMinutes: number, byId: Map<string, Player>): MatchEvent[] {
  const r = rng(m.id + m.seed)
  const out: MatchEvent[] = []
  const onPitch = (half: 1 | 2, t: number) => {
    const minute = (half - 1) * halfMinutes + t / 60
    return m.xi.map((id) => { const s = m.subs.find(([min, off]) => off === id && minute >= min); return s ? s[2] : id }).map((id) => byId.get(id)).filter((p): p is Player => !!p && p.position !== 'GK')
  }
  const who = (half: 1 | 2, t: number, code: EventCode) => {
    const squad = onPitch(half, t)
    const k = KIND[code]
    const w = squad.map((p) => (k ? W[k][p.position] ?? 0.3 : 1))
    let x = r() * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < squad.length; i++) { x -= w[i]; if (x <= 0) return squad[i].id }
    return squad[squad.length - 1]?.id
  }
  const push = (half: 1 | 2, t: number, code: EventCode, side: 'us' | 'them' = 'us', playerId?: string) =>
    out.push({ id: uid('ev_'), matchId: m.id, half, t: Math.round(t), code, side, playerId: side === 'us' ? playerId ?? who(half, t, code) : undefined, createdAt: nowISO() })
  for (const half of [1, 2] as const) {
    let t = 6
    while (t < halfMinutes * 60 - 20) {
      const n = 2 + Math.floor(r() * 5)
      for (let i = 0; i < n; i++) { t += 3 + r() * 5; push(half, t, 'PASS_OK'); if (r() < 0.17) push(half, t + 1, 'PROG'); if (r() < 0.08) push(half, t + 1, 'LINE') }
      if (r() < 0.1) push(half, t + 2, 'FIX2')
      if (r() < 0.05) push(half, t + 3, 'SWITCH')
      if (r() < 0.36) { push(half, t + 4, 'FINAL3'); if (r() < 0.33) { push(half, t + 6, 'BOX'); if (r() < 0.55) { const s = who(half, t + 7, 'SHOT'); push(half, t + 7, 'SHOT', 'us', s); if (r() < 0.45) push(half, t + 7, 'SHOT_IN', 'us', s) } } }
      t += 8
      push(half, t, r() < 0.6 ? 'PASS_LOST' : 'LOSS')
      if (r() < 0.5 && r() < 0.42) { push(half, t + 4, 'REGAIN5'); continue }
      t += 20 + r() * 40
      if (r() < 0.2) push(half, t - 5, 'SHOT', 'them')
      push(half, t, 'REGAIN')
    }
  }
  for (const g of m.goals) {
    if (g.side === 'us') { for (const c of ['SHOT', 'SHOT_IN', 'GOAL'] as EventCode[]) push(g.half, g.t, c, 'us', g.playerId) }
    else { push(g.half, g.t, 'SHOT', 'them'); push(g.half, g.t, 'GOAL', 'them') }
  }
  return out
}

function minutesFrom(xi: string[], bench: string[], subs: [number, string, string][], full: number) {
  const m: Record<string, number> = {}
  for (const id of xi) m[id] = full
  for (const id of bench) m[id] = 0
  for (const [min, off, on] of subs) { m[off] = min; m[on] = full - min }
  return m
}

/* ---------------- the history ---------------- */

export async function seedJourney(lang: L = 'fr') {
  const li: 0 | 1 = lang === 'fr' ? 0 : 1
  await db.transaction('rw', [db.teams, db.players, db.sessions, db.matches, db.events, db.profile, db.evaluations, db.observations, db.attendance, db.objectives, db.milestones], async () => {
    await Promise.all([db.evaluations.clear(), db.observations.clear(), db.attendance.clear(), db.objectives.clear(), db.milestones.clear()])
    const teams = await db.teams.toArray()
    for (const team of teams) await seedTeam(team, li)
    // the player demo: the profile stands for its squad record
    const prof = await db.profile.get('me')
    if (prof && (prof.role === 'player' || prof.role === 'parent') && prof.activeTeamId) {
      const key = prof.name.trim().toLowerCase()
      const me = (await db.players.where('teamId').equals(prof.activeTeamId).toArray()).find((p) => p.name.trim().toLowerCase() === key)
      if (me) await db.profile.update('me', { playerId: me.id })
    }
  })
}

async function seedTeam(team: Team, li: 0 | 1) {
  const isFr = li === 0
  const r = rng(team.id)
  const now = nowISO()
  const today = todayISO()
  const monday = weekStart(today)
  const players = (await db.players.where('teamId').equals(team.id).toArray()).sort((a, b) => (a.number ?? 99) - (b.number ?? 99))
  if (!players.length) return
  const byId = new Map(players.map((p) => [p.id, p]))
  const adult = (ageOf(players[0], team) ?? 20) >= 17
  const youthDemo = team.id === 'team_lionceaux'
  const proDemo = team.id === 'team_etoile'
  const has = (...ids: string[]) => ids.every((id) => byId.has(id))

  /* matches: earlier matches for the youth team, playing time for the played ones */
  if (youthDemo && has('pl_1', 'pl_7', 'pl_8', 'pl_9', 'pl_10', 'pl_12', 'pl_14', 'pl_15', 'pl_16')) {
    const past = await db.matches.get('ma_past')
    const halfMinutes = past?.halfMinutes ?? 35
    const full = 2 * halfMinutes
    const XI = ['pl_1', 'pl_2', 'pl_4', 'pl_5', 'pl_3', 'pl_8', 'pl_6', 'pl_10', 'pl_7', 'pl_9', 'pl_11']
    const swap = (xi: string[], a: string, b: string) => xi.map((x) => (x === a ? b : x))
    const hist: HistMatch[] = [
      { id: 'ma_hist_1', opponent: ['Étoile de Makepe', 'Étoile de Makepe'], offset: -44, home: true, round: 1, xi: XI, bench: ['pl_12', 'pl_14', 'pl_15', 'pl_16'],
        subs: [[halfMinutes, 'pl_1', 'pl_16'], [halfMinutes, 'pl_6', 'pl_14'], [halfMinutes + 10, 'pl_9', 'pl_15'], [halfMinutes + 20, 'pl_4', 'pl_12']],
        goals: [{ half: 1, t: 610, side: 'us', playerId: 'pl_7' }, { half: 1, t: 1490, side: 'us', playerId: 'pl_9' }, { half: 2, t: 940, side: 'us', playerId: 'pl_10' }, { half: 2, t: 1710, side: 'them' }], seed: 3 },
      { id: 'ma_hist_2', opponent: ['Colombe de Bonabéri', 'Colombe de Bonabéri'], offset: -30, home: false, round: 2, xi: swap(XI, 'pl_10', 'pl_14'), bench: ['pl_10', 'pl_12', 'pl_15', 'pl_16'],
        subs: [[halfMinutes, 'pl_14', 'pl_10'], [halfMinutes, 'pl_11', 'pl_15'], [halfMinutes + 15, 'pl_2', 'pl_12']],
        goals: [{ half: 1, t: 820, side: 'them' }, { half: 2, t: 1230, side: 'us', playerId: 'pl_8' }], seed: 7 },
      { id: 'ma_hist_3', opponent: ['Aigles de Logbaba', 'Aigles de Logbaba'], offset: -16, home: false, round: 3, xi: swap(swap(XI, 'pl_1', 'pl_16'), 'pl_11', 'pl_15'), bench: ['pl_1', 'pl_11', 'pl_12', 'pl_14'],
        subs: [[halfMinutes, 'pl_16', 'pl_1'], [halfMinutes, 'pl_15', 'pl_11'], [halfMinutes + 10, 'pl_6', 'pl_14'], [halfMinutes + 20, 'pl_5', 'pl_12']],
        goals: [{ half: 1, t: 1010, side: 'them' }, { half: 2, t: 1530, side: 'them' }], seed: 11 },
    ]
    const slots = formationSlots(team.format, team.formation)
    for (const h of hist) {
      if (await db.matches.get(h.id)) continue
      const us = h.goals.filter((g) => g.side === 'us').length, them = h.goals.length - us
      const m: Match = {
        id: h.id, teamId: team.id, opponent: h.opponent[li], date: addDays(monday, h.offset), time: '15:00', venue: h.home ? (isFr ? 'Terrain de Bonamoussadi' : 'Bonamoussadi ground') : undefined, home: h.home,
        competition: isFr ? `Championnat U13 du Wouri, journée ${h.round}` : `Wouri U13 league, matchday ${h.round}`, format: team.format, formation: team.formation, halfMinutes,
        lineup: slots.map((s, i) => ({ slot: s.id, playerId: h.xi[i] })), subs: h.bench, captainId: h.round === 2 ? 'pl_10' : 'pl_8',
        plan: { possession: '', transitionDef: '', defense: '', transitionOff: '', setPieces: '' }, status: 'done', scoreUs: us, scoreThem: them,
        minutes: minutesFrom(h.xi, h.bench, h.subs, full), createdBy: 'user', createdAt: now,
      }
      await db.matches.put(m)
      await db.events.bulkPut(histEvents(h, halfMinutes, byId))
    }
    // the last match: scorers of our two goals and the shared playing time (everyone plays at U13)
    if (past && past.teamId === team.id && !past.minutes) {
      const goals = (await db.events.where('matchId').equals('ma_past').toArray()).filter((e) => e.code === 'GOAL' && e.side === 'us' && !e.playerId).sort((a, b) => a.half - b.half || a.t - b.t)
      const scorers = ['pl_9', 'pl_7']
      for (let i = 0; i < goals.length && i < scorers.length; i++) await db.events.update(goals[i].id, { playerId: scorers[i] })
      const xi = past.lineup.map((l) => l.playerId).filter((x): x is string => !!x)
      await db.matches.update('ma_past', { minutes: minutesFrom(xi, past.subs, [[halfMinutes, 'pl_1', 'pl_16'], [halfMinutes, 'pl_6', 'pl_14'], [halfMinutes + 15, 'pl_11', 'pl_15'], [halfMinutes + 20, 'pl_4', 'pl_12']].filter(([, a, b]) => xi.includes(a as string) && past.subs.includes(b as string)) as [number, string, string][], full) })
    }
  }
  if (proDemo && has('pl_7', 'pl_8', 'pl_9', 'pl_14', 'pl_17', 'pl_19')) {
    const plan: Record<string, [number, string, string][]> = {
      ma_past: [[66, 'pl_7', 'pl_17'], [75, 'pl_9', 'pl_19'], [80, 'pl_8', 'pl_14']],
      ma_pro_j7: [[62, 'pl_11', 'pl_17'], [74, 'pl_10', 'pl_20'], [83, 'pl_9', 'pl_19']],
      ma_pro_j8: [[58, 'pl_7', 'pl_17'], [70, 'pl_8', 'pl_14'], [81, 'pl_3', 'pl_22']],
    }
    for (const [id, subs] of Object.entries(plan)) {
      const m = await db.matches.get(id)
      if (!m || m.teamId !== team.id || m.minutes || m.status !== 'done') continue
      const xi = m.lineup.map((l) => l.playerId).filter((x): x is string => !!x)
      await db.matches.update(id, { minutes: minutesFrom(xi, m.subs, subs.filter(([, a, b]) => xi.includes(a) && m.subs.includes(b)), 2 * m.halfMinutes) })
    }
  }

  /* sessions: fill the past weeks that have none (two a week for young players, four for adults) */
  const existing = await db.sessions.where('teamId').equals(team.id).toArray()
  const weeks = adult ? 9 : 7
  const youthTitles: Pair[] = [['Rondos et petits jeux', 'Rondos and small-sided games'], ['Jouer vers l\'avant', 'Play forward'], ['Lever la tête', 'Head up'], ['Reprendre en 5 secondes', 'Win it back in 5 seconds'], ['Attirer pour donner', 'Draw to free a teammate']]
  const adultDays: [number, MD, Pair][] = [[1, 'MD-4', ['Tension : duels et petits espaces', 'Tension: duels and small spaces']], [2, 'MD-3', ['Durée : jouer comme le match', 'Duration: play like the match']], [3, 'MD-2', ['Vitesse : transitions et finition', 'Speed: transitions and finishing']], [4, 'MD-1', ['Activation et coups de pied arrêtés', 'Activation and set pieces']]]
  const added: Session[] = []
  for (let w = 1; w <= weeks; w++) {
    const wk = addDays(monday, -7 * w)
    if (existing.some((s) => s.date >= wk && s.date <= addDays(wk, 6))) continue
    const days: [number, MD, Pair][] = adult ? adultDays : [[1, 'youth', youthTitles[w % youthTitles.length]], [3, 'youth', youthTitles[(w + 2) % youthTitles.length]]]
    for (const [d, md, title] of days) {
      added.push({ id: `se_hist_${team.id}_${w}_${d}`, teamId: team.id, title: title[li], date: addDays(wk, d), md, blocks: buildBlocks({ md, ageGroup: team.ageGroup, lang: isFr ? 'fr' : 'en' }), createdBy: 'user', createdAt: now })
    }
  }
  if (added.length) await db.sessions.bulkPut(added)
  const sessions = [...existing, ...added].filter((s) => s.date < today).sort((a, b) => a.date.localeCompare(b.date))

  /* who is new this season, who was injured */
  const newcomers = new Set(youthDemo ? ['pl_12', 'pl_15'] : proDemo ? ['pl_20', 'pl_22'] : [])
  const arrival = addDays(monday, -42)
  const injured = players.filter((p) => /bless|injur/i.test(p.notes ?? '')).map((p) => p.id)
  if (youthDemo && byId.has('pl_6')) injured.push('pl_6')
  const injuryWindow = (pid: string) => (youthDemo && pid === 'pl_6' ? [addDays(monday, -33), addDays(monday, -19)] : [addDays(monday, -20), today])

  /* attendance */
  const marks: Attendance[] = []
  for (const s of sessions) {
    for (const p of players) {
      if (newcomers.has(p.id) && s.date < arrival) continue
      let status: AttendanceStatus
      const inj = injured.includes(p.id) && s.date >= injuryWindow(p.id)[0] && s.date <= injuryWindow(p.id)[1]
      if (inj) status = 'injured'
      else { const x = r(); status = x < 0.86 ? 'present' : x < 0.91 ? 'late' : x < 0.96 ? 'absent' : 'excused' }
      marks.push({ id: attendanceId(s.id, p.id), sessionId: s.id, playerId: p.id, teamId: team.id, date: s.date, status, createdAt: now })
    }
  }
  await db.attendance.bulkPut(marks)
  const presentAt = (pid: string, sid: string) => { const m = marks.find((x) => x.sessionId === sid && x.playerId === pid); return !!m && (m.status === 'present' || m.status === 'late') }

  /* evaluations: from today's levels back to the start of the season, and one from last season */
  const season = seasonOf(today)
  const lastSeason = addDays(season.start, -48)
  const dates = [addDays(monday, -50), addDays(monday, -29), addDays(monday, -8)]
  const evals: Evaluation[] = []
  const lower = (s: Skills, n: number, rr: () => number) => {
    const out = { ...s }
    const keys = SKILL_KEYS.filter((k) => (out[k] ?? 0) > 1)
    for (let i = 0; i < n && keys.length; i++) { const k = keys.splice(Math.floor(rr() * keys.length), 1)[0]; out[k] = ((out[k] as number) - 1) as Level }
    return out
  }
  for (const p of players) {
    const cur = p.skills as Skills
    if (!Object.keys(cur).length) continue
    const pr = rng(team.id + p.id)
    const e3 = cur
    const e2 = lower(e3, adult ? 1 + Math.floor(pr() * 2) : 1 + Math.floor(pr() * 3), pr)
    const e1 = lower(e2, adult ? Math.floor(pr() * 2) : 1 + Math.floor(pr() * 2), pr)
    const e0 = lower(e1, Math.floor(pr() * 2), pr)
    const isNew = newcomers.has(p.id)
    const list: [string, Skills][] = isNew ? [[addDays(arrival, 3), e1], [dates[1], e2], [dates[2], e3]] : [[lastSeason, e0], [dates[0], e1], [dates[1], e2], [dates[2], e3]]
    list.forEach(([date, skills], i) => evals.push({
      id: `eva_demo_${p.id}_${i}`, playerId: p.id, teamId: team.id, date, skills: { ...skills }, by: 'coach', createdAt: now,
      note: i === 0 && !isNew ? (adult ? (isFr ? 'Bilan de fin de saison avec le staff.' : 'End of season review with the staff.') : (isFr ? 'Bilan de fin de saison partagé avec la famille.' : 'End of season review, shared with the family.')) : pr() < 0.35 ? EVAL_NOTES[Math.floor(pr() * EVAL_NOTES.length)][li] : undefined,
    }))
  }
  await db.evaluations.bulkPut(evals)

  /* observations: strengths and things to work on, from sessions and matches */
  const done = (await db.matches.where('teamId').equals(team.id).toArray()).filter((m) => m.status === 'done' && m.date < today)
  const heroes = new Set(youthDemo ? ['pl_8', 'pl_7', 'pl_10'] : proDemo ? ['pl_8', 'pl_5', 'pl_10', 'pl_6'] : players.slice(0, 2).map((p) => p.id))
  const obs: Observation[] = []
  const recent = sessions.filter((s) => s.date >= addDays(monday, -56))
  for (const p of players) {
    const pr = rng(team.id + 'obs' + p.id)
    const lv = p.skills as Skills
    const rated = SKILL_KEYS.filter((k) => lv[k])
    if (!rated.length) continue
    const strong = [...rated].sort((a, b) => (lv[b]! - lv[a]!) || (pr() - 0.5))
    const weak = [...rated].sort((a, b) => (lv[a]! - lv[b]!) || (pr() - 0.5))
    const n = heroes.has(p.id) ? 7 : 3 + Math.floor(pr() * 3)
    for (let i = 0; i < n; i++) {
      const tone: ObsTone = i % 3 === 2 ? 'work' : 'plus'
      const skill = tone === 'plus' ? strong[i % Math.min(3, strong.length)] : weak[Math.floor(i / 3) % Math.min(2, weak.length)]
      const useMatch = done.length > 0 && pr() < 0.35
      const m = useMatch ? pick(pr, done.filter((x) => x.lineup.some((l) => l.playerId === p.id) || x.subs.includes(p.id))) : undefined
      const sPool = recent.filter((s) => presentAt(p.id, s.id))
      const s = !m && sPool.length ? sPool[Math.floor(pr() * sPool.length)] : undefined
      if (!m && !s) continue
      const tag = SKILL_TAG[skill]?.[tone] ?? (tone === 'plus' ? pick(pr, ['effort', 'focus', 'leader']) : pick(pr, ['distracted', 'frustration']))
      const extra = tone === 'plus' && pr() < 0.4 && strong[1] && strong[1] !== skill ? { [strong[1]]: 'plus' as ObsTone } : {}
      obs.push({
        id: `obs_demo_${p.id}_${i}`, playerId: p.id, teamId: team.id, date: (m ?? s)!.date, sessionId: s?.id, matchId: m?.id,
        minute: m ? 5 + Math.floor(pr() * (2 * m.halfMinutes - 8)) : undefined, time: m ? undefined : `${16 + Math.floor(pr() * 2)}:${String(Math.floor(pr() * 6) * 10).padStart(2, '0')}`,
        skills: { [skill]: tone, ...extra }, tags: tag ? [tag] : [], rating: (tone === 'plus' ? 4 + (pr() < 0.4 ? 1 : 0) : 2 + (pr() < 0.5 ? 1 : 0)) as 2 | 3 | 4 | 5,
        note: pr() < 0.75 ? OBS_NOTES[skill][tone][li] : undefined, by: 'coach', createdAt: `${(m ?? s)!.date}T17:${String(10 + i).padStart(2, '0')}:00.000Z`,
      })
    }
  }
  // a shared observation: the same moment seen for two players at once
  const pairIds = youthDemo ? ['pl_8', 'pl_7'] : proDemo ? ['pl_6', 'pl_10'] : players.slice(0, 2).map((p) => p.id)
  const lastS = [...recent].reverse().find((s) => pairIds.every((id) => presentAt(id, s.id)))
  if (lastS && pairIds.every((id) => byId.has(id))) {
    const g = uid('og_')
    for (const id of pairIds) obs.push({ id: `obs_demo_pair_${id}`, playerId: id, teamId: team.id, date: lastS.date, sessionId: lastS.id, time: '17:05', skills: { passe: 'plus', appels: 'plus' }, tags: ['forward', 'free-run'], rating: 5, groupId: g, by: 'coach', createdAt: `${lastS.date}T17:05:00.000Z`,
      note: isFr ? 'Une-deux entre les lignes, puis la passe qui traverse : exactement le Njangi.' : 'One-two between the lines, then the ball goes through: exactly the Njangi.' })
  }
  await db.observations.bulkPut(obs)

  /* objectives: the last cycle (reviewed) and the current one */
  const objs: Objective[] = []
  for (const p of players) {
    const lv = p.skills as Skills
    const rated = SKILL_KEYS.filter((k) => lv[k])
    if (!rated.length) continue
    const pr = rng(team.id + 'obj' + p.id)
    const pe = evals.filter((e) => e.playerId === p.id)
    const isNew = newcomers.has(p.id)
    // last cycle: a competence that moved (achieved) or not (partial / not yet)
    if (!isNew) {
      const e1 = pe[pe.length - 3]?.skills ?? {}, e3 = pe[pe.length - 1]?.skills ?? {}
      const moved = rated.filter((k) => (e3[k] ?? 0) > (e1[k] ?? 0))
      const skill = moved.length ? moved[Math.floor(pr() * moved.length)] : rated[Math.floor(pr() * rated.length)]
      const status = moved.length ? (pr() < 0.75 ? 'achieved' : 'partial') : (pr() < 0.5 ? 'partial' : 'notyet')
      const start = addDays(monday, -64), review = addDays(start, 42)
      objs.push({ id: `obj_demo_${p.id}_a`, playerId: p.id, teamId: team.id, title: OBJ_SKILL[skill][li], skill, start, review, status, reviewNote: REVIEW[status][li], reviewedAt: `${addDays(review, 1)}T18:00:00.000Z`, by: 'coach', createdAt: now })
      // last season too, for the veterans
      if (pr() < 0.5) {
        const k = rated[Math.floor(pr() * rated.length)]
        const st = addDays(lastSeason, -40)
        objs.push({ id: `obj_demo_${p.id}_z`, playerId: p.id, teamId: team.id, title: OBJ_SKILL[k][li], skill: k, start: st, review: lastSeason, status: 'achieved', reviewNote: REVIEW.achieved[li], reviewedAt: `${lastSeason}T18:00:00.000Z`, by: 'coach', createdAt: now })
      }
    }
    // current cycle: the next step, plus a sub-index or a player's own objective for some
    const weakest = [...rated].filter((k) => lv[k]! < 4).sort((a, b) => lv[a]! - lv[b]! || pr() - 0.5)[0]
    const start = addDays(monday, -13)
    if (weakest) objs.push({ id: `obj_demo_${p.id}_b`, playerId: p.id, teamId: team.id, title: OBJ_SKILL[weakest][li], skill: weakest, start, review: addDays(start, 42), status: 'active', by: 'coach', createdAt: now })
    const x = pr()
    if (x < 0.4 && p.position !== 'GK') {
      const sub = SUB_FOR_POS[p.position] ?? 'progression'
      objs.push({ id: `obj_demo_${p.id}_c`, playerId: p.id, teamId: team.id, title: OBJ_SUB[sub][li], sub, start, review: addDays(start, 56), status: 'active', by: 'coach', createdAt: now })
    } else if (x > 0.75 || heroes.has(p.id)) {
      const k: SkillKey = adult ? 'decision' : 'communication'
      if (k !== weakest) objs.push({ id: `obj_demo_${p.id}_d`, playerId: p.id, teamId: team.id, title: adult ? (isFr ? 'Revoir mes actions en vidéo chaque lundi' : 'Watch my own match clips every Monday') : (isFr ? 'Parler plus à mes partenaires sur le terrain' : 'Talk more to my teammates on the pitch'), skill: k, start: addDays(start, 2), review: addDays(start, 44), status: 'active', by: 'player', createdAt: now })
    }
  }
  await db.objectives.bulkPut(objs)

  /* milestones written by the coach */
  const ms: Milestone[] = []
  const add = (pid: string, offset: number, kind: Milestone['kind'], title: Pair, note?: Pair) => {
    if (!byId.has(pid)) return
    ms.push({ id: `mil_demo_${pid}_${kind}_${-offset}`, playerId: pid, teamId: team.id, date: addDays(monday, offset), kind, title: title[li], note: note?.[li], createdAt: now })
  }
  if (youthDemo) {
    add('pl_8', -17, 'callup', ['Convoqué au stage de détection U13 du Littoral', 'Called up to the Littoral U13 scouting camp'], ['Trois jours à Bonabéri avec les meilleurs U13 de la région.', 'Three days in Bonabéri with the best U13 players of the region.'])
    add('pl_6', -33, 'injury', ['Entorse de la cheville', 'Ankle sprain'], ['Deux semaines sans ballon, soins et repos.', 'Two weeks without the ball, care and rest.'])
    add('pl_6', -19, 'return', ['Retour à l\'entraînement', 'Back in training'])
    add('pl_12', -42, 'promotion', ['Surclassé : arrive des U11', 'Moved up from the U11'])
    add('pl_15', -42, 'other', ['Arrivée au club', 'Joined the club'])
    add('pl_7', -2, 'award', ['Joueur du match contre les Requins de Bépanda', 'Player of the match against the Requins de Bépanda'])
  } else if (proDemo) {
    add('pl_5', -24, 'callup', ['Présélectionné en sélection A\'', 'Named in the national A\' preliminary squad'])
    add('pl_10', -26, 'award', ['Joueur du mois de septembre', 'Player of the month, September'])
    add('pl_20', -84, 'promotion', ['Promu des U19 en équipe première', 'Promoted from the U19 to the first team'])
    add('pl_23', -20, 'injury', ['Lésion aux ischio-jambiers', 'Hamstring strain'], ['Retour prévu dans deux semaines.', 'Expected back in two weeks.'])
    add('pl_8', -120, 'other', ['Prolongation de contrat jusqu\'en 2029', 'Contract extended to 2029'])
  }
  await db.milestones.bulkPut(ms)
}
