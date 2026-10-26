// Demo data. "Essayer la démo" fills the browser with a coach's world: the Lionceaux de Bonamoussadi U13
// (the team of Kaydoudou and BriBri in the novel), a week of sessions, a played match with live tags,
// and an upcoming match. Everything stays in this browser.
import { db } from './db'
import type { EventCode, Match, MatchEvent, Player, Profile, Role, Session, SkillKey, Team } from './types'
import { addDays, nowISO, todayISO, uid, weekStart } from './util'
import { formationSlots } from './formations'

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
  ['Kaydoudou', 8, 'DM', 2014, 'R', 4],
  ['Mireille « la Gazelle » Eyenga', 10, 'CM', 2014, 'R', 3],
  ['Cédric Fouda', 6, 'CM', 2013, 'B', 3],
  ['BriBri', 7, 'W', 2015, 'L', 4],
  ['Samuel Owona', 9, 'ST', 2013, 'R', 3],
  ['Yannick Tchoumi', 11, 'W', 2014, 'R', 2],
  ['Hervé Kamga', 12, 'CB', 2014, 'R', 2],
  ['Brice Manga', 14, 'CM', 2014, 'R', 2],
  ['Lucien Etoga', 15, 'ST', 2015, 'L', 2],
  ['Rodrigue Ambassa', 16, 'GK', 2014, 'R', 2],
]

/** Builds a realistic tag stream for a played match (used by the report demo). */
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
      const passes = 2 + Math.floor(rnd() * 9)
      for (let i = 0; i < passes; i++) {
        t += 3 + rnd() * 5
        push(half, t, 'PASS_OK')
        if (rnd() < 0.22) push(half, t + 1, 'PROG')
        if (rnd() < 0.14) push(half, t + 1, 'LINE')
      }
      if (rnd() < 0.18) push(half, t + 2, 'FIX2')
      if (rnd() < 0.12) push(half, t + 3, 'SWITCH')
      if (rnd() < 0.45) { push(half, t + 4, 'FINAL3'); if (rnd() < 0.45) { push(half, t + 6, 'BOX'); if (rnd() < 0.5) { push(half, t + 7, 'SHOT'); if (rnd() < 0.5) push(half, t + 7, 'SHOT_IN') } } }
      t += 8
      push(half, t, rnd() < 0.6 ? 'PASS_LOST' : 'LOSS')
      if (rnd() < 0.5) { if (rnd() < 0.55) { push(half, t + 4, 'REGAIN5'); continue } }
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

export async function seedDemo(role: Role = 'coach', lang: 'fr' | 'en' = 'fr') {
  await db.transaction('rw', [db.profile, db.teams, db.players, db.sessions, db.matches, db.events, db.messages, db.tasks, db.notebook, db.challenges, db.videos], async () => {
    await Promise.all([db.profile.clear(), db.teams.clear(), db.players.clear(), db.sessions.clear(), db.matches.clear(), db.events.clear(), db.messages.clear(), db.tasks.clear(), db.notebook.clear(), db.challenges.clear(), db.videos.clear()])
    const now = nowISO()
    const team: Team = { id: 'team_lionceaux', name: 'Lionceaux de Bonamoussadi U13', ageGroup: 'U13', format: 11, formation: '4-3-3', colors: { primary: '#1F4D3A', secondary: '#E3A92B' }, createdAt: now }
    await db.teams.put(team)
    const players: Player[] = ROSTER.map(([name, number, position, birthYear, foot, base], i) => ({ id: `pl_${number}`, teamId: team.id, name, number, position, birthYear, foot, skills: skills(i + 1, base), createdAt: now }))
    await db.players.bulkPut(players)
    const profile: Profile = {
      id: 'me', name: role === 'player' ? 'Kaydoudou' : 'Tonton Fokou', role, lang, country: 'Cameroun', city: 'Douala', club: 'Lionceaux de Bonamoussadi',
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
      ? { possession: 'Sortir à trois avec Kaydoudou en pivot. Fixer à droite, renverser vers BriBri.', transitionDef: 'Cinq secondes de contre-pression. Défense de repos à 3 + 2.', defense: 'Bloc médian, pressing sur passe en arrière.', transitionOff: 'Regarder devant : BriBri et Samuel attaquent la profondeur.', setPieces: 'Corners rentrants, Paul et Steve au premier poteau.' }
      : { possession: 'Build up with three, Kaydoudou as the pivot. Overload right, switch to BriBri.', transitionDef: 'Five seconds of counter-press. Rest defence 3 + 2.', defense: 'Mid block, press on the back pass.', transitionOff: 'Look forward first: BriBri and Samuel attack the space in behind.', setPieces: 'Inswinging corners, Paul and Steve at the near post.' }
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
}

/** Create a fresh empty profile (from onboarding). */
export async function createProfile(p: Omit<Profile, 'id' | 'createdAt' | 'onboarded' | 'plan'> & { plan?: Profile['plan'] }) {
  const profile: Profile = { plan: 'free', ...p, id: 'me', onboarded: true, createdAt: nowISO() }
  await db.profile.put(profile)
  return profile
}
