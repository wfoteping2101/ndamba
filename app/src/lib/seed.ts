// Demo data. "Essayer la démo" fills the browser with a coach's world: the Lionceaux de Bonamoussadi U13
// (the team of Kaydoudou and BriBri in the novel), a week of sessions, a played match with live tags,
// and an upcoming match. Everything stays in this browser.
import { db } from './db'
import type { Clip, EventCode, Match, MatchEvent, Player, Profile, Role, Score5, Session, SkillKey, Team, VideoProject, Wellness } from './types'
import { addDays, nowISO, todayISO, uid, weekStart } from './util'
import { formationSlots } from './formations'
import { seedJourney } from './seedJourney' // PARCOURS
import { PRO_BENCH, PRO_PAST_GOALS, PRO_ROSTER, PRO_VIDEO, PRO_XI, locateProMatch, proDemoEvents } from './proMatch'

const SKILLS: SkillKey[] = ['scan', 'controle', 'passe', 'conduite', 'dribble-njangi', 'appels', 'communication', 'protection', 'contre-pression', 'decision']

function skills(seed: number, base: number): Player['skills'] {
  const out: Player['skills'] = {}
  SKILLS.forEach((k, i) => {
    const v = base + (((seed * 7 + i * 13) % 5) - 2) / 2
    out[k] = Math.max(1, Math.min(4, Math.round(v))) as 1 | 2 | 3 | 4
  })
  return out
}

const ROSTER: [string, number, string, number, 'R' | 'L' | 'B', number][] = [
  ['Ousmane « Petit Pied » Bello', 1, 'GK', 2014, 'R', 3],
  ['Junior Ndzana', 2, 'FB', 2013, 'R', 2],
  ['Paul Ebanda', 4, 'CB', 2013, 'R', 3],
  ['Steve Mbarga', 5, 'CB', 2013, 'L', 3],
  ['Arnold Nkolo', 3, 'FB', 2014, 'L', 2],
  ['BriBri', 8, 'DM', 2014, 'R', 4],
  ['Mireille « la Gazelle » Eyenga', 10, 'CM', 2014, 'R', 3],
  ['Cédric Fouda', 6, 'CM', 2013, 'B', 3],
  ['Kaydoudou', 7, 'W', 2016, 'L', 4], // 10 in 2026, as in the novel (BriBri 12)
  ['Samuel Owona', 9, 'ST', 2013, 'R', 3],
  ['Yannick Tchoumi', 11, 'W', 2014, 'R', 2],
  ['Hervé Kamga', 12, 'CB', 2014, 'R', 2],
  ['Brice Manga', 14, 'CM', 2014, 'R', 2],
  ['Lucien Etoga', 15, 'ST', 2015, 'L', 2],
  ['Rodrigue Ambassa', 16, 'GK', 2014, 'R', 2],
]

/** Builds a realistic tag stream for a played match (used by the report demo). Tuned for a mid-band Indice (around 60 to 65, « Njangi en construction ») with Fixation as the clear weak point, so the report has something to teach. */
function demoEvents(matchId: string, players: Player[]): MatchEvent[] {
  const out: MatchEvent[] = []
  let r = 11
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 }
  const outfield = players.filter((p) => p.position !== 'GK').map((p) => p.id)
  const push = (half: 1 | 2, t: number, code: EventCode, side: 'us' | 'them' = 'us') =>
    out.push({ id: uid('ev_'), matchId, half, t: Math.round(t), code, side, playerId: side === 'us' && code !== 'GOAL' ? outfield[Math.floor(rnd() * outfield.length)] : undefined, createdAt: nowISO() })
  for (const half of [1, 2] as const) {
    let t = 5
    while (t < 35 * 60) {
      // one possession of ours
      const passes = 2 + Math.floor(rnd() * 5)
      for (let i = 0; i < passes; i++) {
        t += 3 + rnd() * 5
        push(half, t, 'PASS_OK')
        if (rnd() < 0.18) push(half, t + 1, 'PROG')
        if (rnd() < 0.09) push(half, t + 1, 'LINE')
      }
      if (rnd() < 0.10) push(half, t + 2, 'FIX2')
      if (rnd() < 0.06) push(half, t + 3, 'SWITCH')
      if (rnd() < 0.38) { push(half, t + 4, 'FINAL3'); if (rnd() < 0.35) { push(half, t + 6, 'BOX'); if (rnd() < 0.6) { push(half, t + 7, 'SHOT'); if (rnd() < 0.5) push(half, t + 7, 'SHOT_IN') } } else if (rnd() < 0.22) { push(half, t + 6, 'SHOT'); if (rnd() < 0.35) push(half, t + 6, 'SHOT_IN') } }
      t += 8
      push(half, t, rnd() < 0.6 ? 'PASS_LOST' : 'LOSS')
      if (rnd() < 0.5) { if (rnd() < 0.42) { push(half, t + 4, 'REGAIN5'); continue } }
      // their possession
      t += 20 + rnd() * 40
      if (rnd() < 0.2) push(half, t - 5, 'SHOT', 'them')
      push(half, t, 'REGAIN')
    }
  }
  // goals: us 2 (one each half), them 1
  out.push({ id: uid('ev_'), matchId, half: 1, t: 1270, code: 'GOAL', side: 'us', createdAt: nowISO() })
  out.push({ id: uid('ev_'), matchId, half: 2, t: 860, code: 'GOAL', side: 'them', createdAt: nowISO() })
  out.push({ id: uid('ev_'), matchId, half: 2, t: 1980, code: 'GOAL', side: 'us', createdAt: nowISO() })
  return out
}

export async function seedDemo(role: Role = 'coach', lang: 'fr' | 'en' = 'fr', level: DemoLevel = 'youth') {
  // a demo replaces the browser's data, including what the player space keeps beside the database
  try { for (const k of ['njangi.lessons', 'njangi.lessons.part', 'njangi.self']) localStorage.removeItem(k) } catch { /* storage unavailable */ }
  if (level === 'pro') return seedProDemo(role, lang) // the professional club (see the PRO DEMO block below)
  await db.transaction('rw', [db.profile, db.teams, db.players, db.sessions, db.matches, db.events, db.messages, db.tasks, db.notebook, db.challenges, db.videos], async () => {
    await Promise.all([db.profile.clear(), db.teams.clear(), db.players.clear(), db.sessions.clear(), db.matches.clear(), db.events.clear(), db.messages.clear(), db.tasks.clear(), db.notebook.clear(), db.challenges.clear(), db.videos.clear()])
    const now = nowISO()
    const team: Team = { id: 'team_lionceaux', name: 'Lionceaux de Bonamoussadi U13', ageGroup: 'U13', format: 11, formation: '4-3-3', colors: { primary: '#0B5D3B', secondary: '#F5B700' }, createdAt: now }
    await db.teams.put(team)
    const players: Player[] = ROSTER.map(([name, number, position, birthYear, foot, base], i) => ({ id: `pl_${number}`, teamId: team.id, name, number, position, birthYear, foot, skills: skills(i + 1, base), createdAt: now }))
    await db.players.bulkPut(players)
    const profile: Profile = {
      id: 'me', name: role === 'player' ? 'BriBri' : 'Tonton Fokou', role, lang, country: 'Cameroun', city: 'Douala', club: 'Lionceaux de Bonamoussadi',
      ageGroup: 'U13', position: role === 'player' ? 'DM' : undefined, goals: role === 'player' ? ['scan', 'passe'] : ['identite', 'semaine', 'analyse'],
      plan: 'coach', onboarded: true, activeTeamId: team.id, createdAt: now,
    }
    await db.profile.put(profile)

    // This week: next match on Saturday, sessions MD-4 to MD-1.
    const today = todayISO()
    const monday = weekStart(today)
    const saturday = addDays(monday, 5)
    const mk = (date: string, md: Session['md'], title: string, blocks: [string, number][]): Session => ({
      id: uid('se_'), teamId: team.id, title, date, md, blocks: blocks.map(([drillId, minutes]) => ({ id: uid('bl_'), drillId, minutes })), createdBy: 'user', createdAt: now,
    })
    await db.sessions.bulkPut([
      mk(addDays(saturday, -4), 'MD-4', lang === 'fr' ? 'Tension : petits espaces' : 'Tension: small spaces', [['R01', 12], ['R08', 15], ['S04', 20], ['S08', 15]]),
      mk(addDays(saturday, -3), 'MD-3', lang === 'fr' ? 'Durée : jouer comme le match' : 'Duration: play like the match', [['R02', 12], ['P02', 20], ['L02', 30]]),
      mk(addDays(saturday, -2), 'MD-2', lang === 'fr' ? 'Vitesse : transitions' : 'Speed: transitions', [['R05', 10], ['T02', 15], ['T05', 15], ['G02', 15]]),
      mk(addDays(saturday, -1), 'MD-1', lang === 'fr' ? 'Activation et coups de pied arrêtés' : 'Activation and set pieces', [['R07', 10], ['G06', 15]]),
    ])

    const slots = formationSlots(11, '4-3-3')
    const order = ['pl_1', 'pl_2', 'pl_4', 'pl_5', 'pl_3', 'pl_8', 'pl_6', 'pl_10', 'pl_7', 'pl_9', 'pl_11']
    const lineup = slots.map((s, i) => ({ slot: s.id, playerId: order[i] }))
    const plan = lang === 'fr'
      ? { possession: 'Sortir à trois avec BriBri en pivot. Fixer à droite, renverser vers Kaydoudou.', transitionDef: 'Cinq secondes de contre-pression. Défense de repos à 3 + 2.', defense: 'Bloc médian, pressing sur passe en arrière.', transitionOff: 'Regarder devant : Kaydoudou et Samuel attaquent la profondeur.', setPieces: 'Corners rentrants, Paul et Steve au premier poteau.' }
      : { possession: 'Build up with three, BriBri as the pivot. Overload right, switch to Kaydoudou.', transitionDef: 'Five seconds of counter-press. Rest defence 3 + 2.', defense: 'Mid block, press on the back pass.', transitionOff: 'Look forward first: Kaydoudou and Samuel attack the space in behind.', setPieces: 'Inswinging corners, Paul and Steve at the near post.' }
    const past: Match = {
      id: 'ma_past', teamId: team.id, opponent: 'Requins de Bépanda', date: addDays(monday, -2), time: '15:00', venue: 'Terrain de Bonamoussadi', home: true,
      competition: lang === 'fr' ? 'Tournoi des quartiers' : 'Neighbourhood tournament', format: 11, formation: '4-3-3', halfMinutes: 35, lineup, subs: ['pl_12', 'pl_14', 'pl_15', 'pl_16'],
      captainId: 'pl_8', plan, status: 'done', scoreUs: 2, scoreThem: 1, createdBy: 'user', createdAt: now,
    }
    const next: Match = {
      ...past, id: 'ma_next', opponent: 'Panthères de Deïdo', date: saturday, time: '16:00', venue: lang === 'fr' ? 'Stade de Deïdo' : 'Deïdo stadium', home: false,
      status: 'planned', scoreUs: 0, scoreThem: 0,
    }
    await db.matches.bulkPut([past, next])
    await db.events.bulkPut(demoEvents(past.id, players))
  })
  await seedJourney(lang) // PARCOURS: the season's history (see lib/seedJourney.ts)
  await seedPerformance(role, 'youth') // PERFORMANCE: only clears the form and load log (see the block at the end)
}

/* ==================================================================================================
 * PRO DEMO (begin): « Étoile de la Côte », a fictional professional club of Douala, Seniors, Ligue 1.
 * seedDemo(role, lang, 'pro') lands here. 22 adult players in a 4-3-3, a fixture list, a played match
 * (2-1 against the Météore de Bafoussam) with a full stream of live tags (Indice Njangi 67.9, « Njangi
 * solide », Fixation as the weak point), and the week MD+1, MD-4 to MD-1 at adult intensity before the
 * away match at the Rapides de Kribi on Saturday. Every name is invented. Ids reuse the youth demo's
 * match ids (ma_past, ma_next) so links like /app/analyse/rapport/ma_past work with both demos.
 * ================================================================================================== */

export type DemoLevel = 'youth' | 'pro'
/** Team ids of the two demos (to know which demo, if any, the browser holds). */
export const DEMO_TEAMS: Record<DemoLevel, string> = { youth: 'team_lionceaux', pro: 'team_etoile' }

// [name, number, position, birthYear, foot, skill base, note fr, note en]
async function seedProDemo(role: Role, lang: 'fr' | 'en') {
  const fr = lang === 'fr'
  await db.transaction('rw', [db.profile, db.teams, db.players, db.sessions, db.matches, db.events, db.messages, db.tasks, db.notebook, db.challenges, db.videos], async () => {
    await Promise.all([db.profile.clear(), db.teams.clear(), db.players.clear(), db.sessions.clear(), db.matches.clear(), db.events.clear(), db.messages.clear(), db.tasks.clear(), db.notebook.clear(), db.challenges.clear(), db.videos.clear()])
    const now = nowISO()
    const team: Team = { id: DEMO_TEAMS.pro, name: 'Étoile de la Côte', ageGroup: 'Seniors', format: 11, formation: '4-3-3', colors: { primary: '#14506B', secondary: '#F5B700' }, createdAt: now }
    await db.teams.put(team)
    const players: Player[] = PRO_ROSTER.map(([name, number, position, birthYear, foot, base, noteFr, noteEn], i) => ({
      id: `pl_${number}`, teamId: team.id, name, number, position, birthYear, foot, skills: skills(i + 3, base), notes: (fr ? noteFr : noteEn) || undefined, createdAt: now,
    }))
    await db.players.bulkPut(players)
    const player = role === 'player'
    const profile: Profile = {
      id: 'me', name: player ? 'Steve Ndjock' : 'Daniel Mbarga', role, lang, country: 'Cameroun', city: 'Douala', club: team.name,
      ageGroup: 'Seniors', position: player ? 'CM' : undefined, goals: player ? ['progresser', 'analyse'] : ['identite', 'semaine', 'analyse'],
      plan: 'coach', onboarded: true, activeTeamId: team.id, playerId: player ? 'pl_8' : undefined, createdAt: now,
    }
    await db.profile.put(profile)

    // The week: Sunday recovery after the home win, then MD-4 to MD-1 before Saturday's away match.
    const monday = weekStart(todayISO())
    const saturday = addDays(monday, 5)
    const mk = (date: string, md: Session['md'], title: [string, string], blocks: ([string, number] | [null, number, string, string])[], notes: [string, string], intention?: Session['intention']): Session => ({
      id: uid('se_'), teamId: team.id, title: fr ? title[0] : title[1], date, md, intention, notes: fr ? notes[0] : notes[1], createdBy: 'user', createdAt: now,
      blocks: blocks.map((b) => (b[0] ? { id: uid('bl_'), drillId: b[0], minutes: b[1] } : { id: uid('bl_'), title: fr ? b[2] : b[3], minutes: b[1] })),
    })
    await db.sessions.bulkPut([
      mk(addDays(monday, -1), 'MD+1', ['Récupération : régénération et compensation', 'Recovery: regeneration and top-up'],
        [[null, 30, 'Régénération des titulaires : vélo, mobilité, bains froids', 'Starters regenerate: bike, mobility, cold baths'], ['R01', 14], ['S05', 24]],
        ['Titulaires (plus de 60 minutes jouées) : régénération seulement. Remplaçants : compensation à haute intensité en 6 contre 6.', 'Starters (more than 60 minutes played): regeneration only. Substitutes: high-intensity top-up in 6 v 6.']),
      mk(addDays(saturday, -4), 'MD-4', ['Tension : duels et petits espaces', 'Tension: duels and small spaces'],
        [['R08', 17], ['P04', 22], ['S03', 28], ['T03', 22]],
        ['Charge haute, RPE cible 7 à 8, environ 90 minutes. Séries de 4 minutes, 90 secondes de récupération active. Beaucoup de duels et de changements de direction.', 'High load, target RPE 7 to 8, about 90 minutes. 4-minute sets, 90 seconds of active recovery. Plenty of duels and changes of direction.'], 'reprendre'),
      mk(addDays(saturday, -3), 'MD-3', ['Durée : jouer comme le match', 'Duration: play like the match'],
        [['R04', 17], ['P07', 22], ['L03', 38]],
        ['La séance la plus longue de la semaine : grand terrain, séquences de 8 à 10 minutes, RPE cible 7. Thème : fixer pour libérer, notre point faible contre Bafoussam.', 'The longest session of the week: full pitch, 8 to 10 minute blocks, target RPE 7. Theme: draw to free a teammate, our weak point against Bafoussam.'], 'fixer'),
      mk(addDays(saturday, -2), 'MD-2', ['Vitesse : transitions et finition', 'Speed: transitions and finishing'],
        [['R03', 15], ['T04', 26], ['F04', 26], ['G05', 17]],
        ['Intensité haute, volume réduit : efforts courts, sprints de 20 à 30 mètres, récupération complète entre les répétitions. RPE cible 6.', 'High intensity, lower volume: short efforts, 20 to 30 metre sprints, full recovery between reps. Target RPE 6.'], 'regarder-devant'),
      mk(addDays(saturday, -1), 'MD-1', ['Activation et coups de pied arrêtés', 'Activation and set pieces'],
        [['R02', 15], ['G03', 18], [null, 20, 'Coups de pied arrêtés : corners rentrants, défense en zone mixte', 'Set pieces: inswinging corners, mixed zonal marking']],
        ['Volume faible, vitesse et précision : 55 minutes, RPE cible 3 à 4. Rappel du plan de jeu à Kribi.', 'Low volume, speed and precision: 55 minutes, target RPE 3 to 4. Game plan reminder for Kribi.']),
    ])

    // The fixture list: three league matches played, the away match on Saturday, a cup tie, the next league match.
    const slots = formationSlots(11, '4-3-3')
    const lineup = slots.map((s, i) => ({ slot: s.id, playerId: PRO_XI[i] }))
    const plan = fr
      ? { possession: 'Sortie à trois : Mbock entre les centraux, latéraux hauts. Fixer à gauche avec Kemayou et Nana, renverser vers Moukoko dans le dos de leur latéral.', transitionDef: 'Cinq secondes de contre-pression. Défense de repos à 3 + 2 : Essomba, Mvogo et Ekwalla, avec Mbock et Ndjock devant eux.', defense: 'Bloc médian en 4-1-4-1, pressing déclenché sur la passe vers leur latéral droit.', transitionOff: 'Premier regard pour Eyoum en profondeur. Si c\'est fermé, on respire et on fixe.', setPieces: 'Corners rentrants au premier poteau pour Essomba et Mvogo. Défense en zone mixte, Eyoum au premier poteau.' }
      : { possession: 'Build up with three: Mbock drops between the centre-backs, full-backs high. Overload the left with Kemayou and Nana, switch to Moukoko behind their full-back.', transitionDef: 'Five seconds of counter-press. Rest defence 3 + 2: Essomba, Mvogo and Ekwalla, with Mbock and Ndjock in front of them.', defense: 'Mid block in a 4-1-4-1, press triggered by the pass to their right-back.', transitionOff: 'First look for Eyoum in behind. If it is closed, we breathe and draw them in.', setPieces: 'Inswinging corners to the near post for Essomba and Mvogo. Mixed zonal marking, Eyoum on the near post.' }
    const league = (n: number) => (fr ? `Ligue 1, journée ${n}` : `Ligue 1, matchday ${n}`)
    const home = fr ? 'Stade de l\'Étoile, Douala' : 'Étoile stadium, Douala'
    const base = { teamId: team.id, format: 11 as const, formation: '4-3-3', halfMinutes: 45, lineup, subs: PRO_BENCH, captainId: 'pl_5', plan, createdBy: 'user' as const, createdAt: now }
    const matches: Match[] = [
      { ...base, id: 'ma_pro_j7', opponent: 'Éclair de Garoua', date: addDays(monday, -16), time: '15:30', venue: fr ? 'Stade de l\'Éclair, Garoua' : 'Éclair stadium, Garoua', home: false, competition: league(7), status: 'done', scoreUs: 1, scoreThem: 1 },
      { ...base, id: 'ma_pro_j8', opponent: 'Avenir du Mungo', date: addDays(monday, -9), time: '16:00', venue: home, home: true, competition: league(8), status: 'done', scoreUs: 2, scoreThem: 0 },
      { ...base, id: 'ma_past', opponent: 'Météore de Bafoussam', date: addDays(monday, -2), time: '16:00', venue: home, home: true, competition: league(9), status: 'done', scoreUs: 2, scoreThem: 1 },
      { ...base, id: 'ma_next', opponent: 'Rapides de Kribi', date: saturday, time: '15:30', venue: fr ? 'Stade des Rapides, Kribi' : 'Rapides stadium, Kribi', home: false, competition: league(10), status: 'planned', scoreUs: 0, scoreThem: 0 },
      { ...base, id: 'ma_pro_cup', opponent: 'Espoir de Mbalmayo', date: addDays(saturday, 4), time: '15:00', venue: home, home: true, competition: fr ? 'Coupe nationale, 16e de finale' : 'National cup, round of 32', status: 'planned', scoreUs: 0, scoreThem: 0 },
      { ...base, id: 'ma_pro_j11', opponent: 'Flamme de Bertoua', date: addDays(saturday, 8), time: '16:00', venue: home, home: true, competition: league(11), status: 'planned', scoreUs: 0, scoreThem: 0 },
    ]
    await db.matches.bulkPut(matches)
    // The played match, coded on its video: every action has its place on the pitch and its moment in the
    // demo video (a 2D animation drawn from these very codes, hosted by Ndamba: see tools/render_demo_match.mjs).
    const evs = proDemoEvents('ma_past', players, PRO_PAST_GOALS)
    const keys = locateProMatch(evs)
    const len1 = Math.ceil(keys[1][keys[1].length - 1].t)
    const kickoff2 = len1 + PRO_VIDEO.halftime
    const duration = kickoff2 + Math.ceil(keys[2][keys[2].length - 1].t)
    for (const e of evs) e.videoT = e.half === 1 ? e.t : kickoff2 + e.t
    await db.events.bulkPut(evs)
    await db.matches.update('ma_past', { potmId: 'pl_9' })
    await db.videos.put(proDemoVideo(evs, kickoff2, duration, team.id, fr))
  })
  await seedJourney(lang) // PARCOURS: the season's history (see lib/seedJourney.ts)
  await seedPerformance(role, 'pro') // PERFORMANCE: four weeks of form and load for Steve Ndjock (see below)
}

/** The demo video of the played match: hosted by Ndamba (demonstration), with a few clips and a video session. */
function proDemoVideo(evs: MatchEvent[], kickoff2: number, duration: number, teamId: string, fr: boolean): VideoProject {
  const now = nowISO()
  const at = (half: 1 | 2, code: MatchEvent['code'], side: 'us' | 'them', pick = 0) => evs.filter((e) => e.half === half && e.code === code && e.side === side).sort((a, b) => a.t - b.t)[pick]
  const g1 = at(1, 'GOAL', 'us'), g2 = at(2, 'GOAL', 'them'), g3 = at(2, 'GOAL', 'us')
  const quick = evs.filter((e) => e.code === 'REGAIN5' && e.half === 1).sort((a, b) => a.t - b.t)[3]
  const line = evs.filter((e) => e.code === 'LINE' && e.half === 2).sort((a, b) => a.t - b.t)[2]
  const lost = evs.filter((e) => e.code === 'LOSS' && e.half === 2 && e.videoT! < g2.videoT!).sort((a, b) => b.t - a.t)[0]
  const clip = (id: string, e: MatchEvent | undefined, before: number, after: number, title: [string, string], note: [string, string], playerIds: string[] = []): Clip | null =>
    e?.videoT === undefined ? null : { id, start: Math.max(0, e.videoT - before), end: Math.min(duration, e.videoT + after), title: fr ? title[0] : title[1], note: fr ? note[0] : note[1], playerIds, createdAt: now }
  const clips = [
    clip('cl_demo_g1', g1, 14, 5, ['But d\'Eyoum : la sortie à trois jusqu\'au but', 'Eyoum\'s goal: the build-up with three to the goal'], ['Mbock décroche entre les centraux, la ligne est traversée, Eyoum finit. C\'est le plan.', 'Mbock drops between the centre-backs, the line is broken, Eyoum finishes. That is the plan.'], ['pl_6', 'pl_9']),
    clip('cl_demo_regain', quick, 8, 5, ['Contre-pression : reprise en moins de 5 secondes', 'Counter-press: won back within 5 seconds'], ['Trois joueurs ferment la sortie, le ballon revient tout de suite.', 'Three players close the exit, the ball comes straight back.']),
    clip('cl_demo_line', line, 8, 6, ['Ligne traversée en seconde période', 'Line broken in the second half'], ['Le bon moment pour jouer entre les lignes : le milieu adverse est fixé.', 'The right moment to play between the lines: their midfield is pinned.']),
    clip('cl_demo_loss', lost, 4, 12, ['La perte qui précède leur but', 'The loss before their goal'], ['Défense de repos à deux seulement derrière le ballon : à corriger.', 'Rest defence with only two behind the ball: to fix.']),
    clip('cl_demo_g2', g2, 12, 4, ['Leur but', 'Their goal'], ['Regardez la distance entre nos centraux au départ de l\'action.', 'Look at the distance between our centre-backs when the move starts.']),
    clip('cl_demo_g3', g3, 12, 5, ['But de Sali, entré à la 66e', 'Goal by Sali, on at the 66th minute'], ['Le remplaçant attaque l\'espace laissé par leur latéral.', 'The substitute attacks the space left by their full-back.'], ['pl_17']),
  ].filter((c): c is Clip => !!c)
  return {
    id: 'vp_demo_past', title: fr ? 'Étoile de la Côte contre Météore de Bafoussam' : 'Étoile de la Côte v Météore de Bafoussam',
    source: 'hosted', url: PRO_VIDEO.url, matchId: 'ma_past', teamId, kind: 'match', duration, kickoff1: 0, kickoff2,
    ourColor: fr ? 'bleu et or' : 'blue and gold', theirColor: fr ? 'rouge' : 'red', attackRight1: true,
    hosting: { plan: 'club', uploadedAt: now, demo: true }, tags: [], clips,
    playlists: [{ id: 'pl_demo_monday', title: fr ? 'Séance vidéo de lundi : nos sorties et notre repos' : 'Monday video session: our build-up and rest defence', clipIds: ['cl_demo_g1', 'cl_demo_line', 'cl_demo_regain', 'cl_demo_loss', 'cl_demo_g2'], note: fr ? 'Quinze minutes, cinq extraits : deux pour ce qui marche, deux pour ce qu\'on corrige, un pour finir sur le plan de jeu.' : 'Fifteen minutes, five clips: two for what works, two to fix, one to end on the game plan.', createdAt: now }],
    createdAt: now,
  }
}

/* ======================================== PRO DEMO (end) ======================================== */

/* ==================================================================================================
 * PLAYER PERFORMANCE DEMO (begin): the form and load log of the performance space (db.wellness,
 * Le Code Njangi, chapter 29). Only the pro demo opened as a player gets data: Steve Ndjock (pl_8,
 * central midfielder of Étoile de la Côte) logged four weeks of morning questionnaires and of
 * perceived exertion after the sessions he attended and the matches he played (plus a friendly on the
 * free Saturday four weeks ago, so every week of the comparison has its match). Today is left empty,
 * so the demo opens on the questionnaire. Every other demo only clears the table.
 * ================================================================================================== */

async function seedPerformance(role: Role, level: DemoLevel) {
  await db.wellness.clear()
  if (level !== 'pro' || role !== 'player') return
  const pid = 'pl_8'
  const today = todayISO()
  const [sessions, matches, marks] = await Promise.all([
    db.sessions.where('teamId').equals(DEMO_TEAMS.pro).toArray(),
    db.matches.where('teamId').equals(DEMO_TEAMS.pro).toArray(),
    db.attendance.where('playerId').equals(pid).toArray(),
  ])
  const status = new Map(marks.map((a) => [a.sessionId, a.status]))
  let r = 41
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 }
  const score = (v: number) => Math.max(1, Math.min(5, Math.round(v))) as Score5
  const played = (m: Match) => m.minutes?.[pid] ?? (m.lineup.some((l) => l.playerId === pid) ? 2 * m.halfMinutes : 0)
  const out: Wellness[] = []
  for (let k = 28; k >= 1; k--) {
    const date = addDays(today, -k)
    const match = matches.find((m) => m.date === date && m.status === 'done')
    const after = matches.find((m) => m.date === addDays(date, -1) && m.status === 'done')
    const after2 = matches.find((m) => m.date === addDays(date, -2) && m.status === 'done')
    const s = sessions.find((x) => x.date === date)
    const att = s ? status.get(s.id) : undefined
    const trained = !!s && (att === 'present' || att === 'late')
    // the questionnaire: around 4 out of 5, lower the morning after a match, higher on the eve of one
    const b = 4 + (rnd() - 0.5) * 0.9
    let sleep = b + 0.1, fatigue = b, soreness = b, mood = b + 0.1, stress = b + 0.2
    if (after && played(after) > 0) { fatigue -= 1.5; soreness -= 1.6; sleep -= 0.8; mood += after.scoreUs >= after.scoreThem ? 0.6 : -0.7 }
    else if (after2 && played(after2) > 0) { fatigue -= 0.6; soreness -= 0.8 }
    if (s?.md === 'MD-3') soreness -= 0.5
    if (s?.md === 'MD-2') fatigue -= 0.3
    if (s?.md === 'MD-1') { fatigue += 0.5; soreness += 0.5 }
    if (match) { stress -= 0.5; mood += 0.3; fatigue += 0.4 }
    // the exertion, about thirty minutes after: the shape of the example week of chapter 29
    let rpe: number | undefined, minutes: number | undefined, sessionId: string | undefined, matchId: string | undefined
    const friendly = !match && !s && k > 20 && new Date(`${date}T12:00:00`).getDay() === 6 && !matches.some((m) => m.status === 'done' && Math.abs(new Date(m.date).getTime() - new Date(date).getTime()) < 5 * 86400000)
    if (match && played(match) > 0) { rpe = 8 + (rnd() < 0.5 ? 1 : 0); minutes = played(match); matchId = match.id }
    else if (friendly) { rpe = 8; minutes = 75 }
    else if (trained && s) {
      const total = s.blocks.reduce((a, x) => a + (x.minutes || 0), 0) || 60
      const regen = !!after && played(after) > 60
      const byMd: Partial<Record<Session['md'], [number, number]>> = {
        'MD+1': regen ? [2, Math.min(40, total)] : [6, total], 'MD-4': [7 + (rnd() < 0.4 ? 1 : 0), total], 'MD-3': [7, total], 'MD-2': [5 + (rnd() < 0.5 ? 1 : 0), total], 'MD-1': [3, total], youth: [5, total],
      }
      const v = byMd[s.md]
      if (v) { [rpe, minutes] = v; sessionId = s.id }
    }
    const skipForm = k > 5 && rnd() < 0.11 // one morning in nine without the questionnaire, never in the last five days
    if (skipForm && rpe === undefined) continue
    out.push({
      id: `wl_${date}`, date, playerId: pid,
      ...(skipForm ? {} : { sleep: score(sleep), fatigue: score(fatigue), soreness: score(soreness), mood: score(mood), stress: score(stress) }),
      rpe, minutes, sessionId, matchId, createdAt: `${date}T07:40:00.000Z`,
    })
  }
  await db.wellness.bulkPut(out)
}

/* ================================== PLAYER PERFORMANCE DEMO (end) ================================== */

/** Create a fresh empty profile (from onboarding). */
export async function createProfile(p: Omit<Profile, 'id' | 'createdAt' | 'onboarded' | 'plan'> & { plan?: Profile['plan'] }) {
  const profile: Profile = { plan: 'free', ...p, id: 'me', onboarded: true, createdAt: nowISO() }
  await db.profile.put(profile)
  return profile
}
