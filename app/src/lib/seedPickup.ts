// Demo data for the pickup games (« Matchs entre amis »). Every name is invented.
// « Foot du dimanche, Bonamoussadi » (Douala): 16 players, me as host (« Le Coach »), six played Sundays
// with teams, scores, check-ins, two late arrivals, one no-show, payments mostly done and peer ratings,
// then this Sunday's game: 9 of 10 spots taken, the freed tenth spot offered to the first of 2 on the waitlist.
// « Five du jeudi, Bastos » (Yaoundé): a smaller group where I am a player, not the organiser.
import { db } from './db'
import type { PayMethod, PickupGame, PickupGroup, PickupPlayer, PickupRating } from './types'
import { addDays, nowISO, todayISO } from './util'
import { balanceTeams, writeHostPlan, type PickupRsvpX } from './pickup'

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const iso = (date: string, time: string, minutes = 0) => new Date(new Date(`${date}T${time}:00`).getTime() + minutes * 60000).toISOString()

export async function seedPickup(lang: 'fr' | 'en'): Promise<void> {
  const profile = await db.profile.get('me')
  const myName = profile?.name || (lang === 'fr' ? 'Moi' : 'Me')
  const today = todayISO()
  const now = nowISO()
  const r = rng(2026)
  const dow = new Date(`${today}T00:00:00`).getDay()
  const sunday = addDays(today, (7 - dow) % 7 || 7)
  const thursday = addDays(today, (4 - dow + 7) % 7 || 7)

  /* ---------------- Foot du dimanche, Bonamoussadi ---------------- */
  const G1 = 'pg_bonamoussadi'
  const roster: [string, string, number][] = [
    [myName, 'Le Coach', 3.9],
    ['Junior Mbarga', 'Petit Pied', 4.5],
    ['Serge Ndjock', 'Le Mur', 4.3],
    ['Arnaud Fotso', 'Gazelle', 4.4],
    ['Hervé Tchapda', 'Bulldozer', 3.8],
    ['Christian Essomba', 'Magicien', 4.0],
    ['Landry Ngono', 'Vieux Père', 3.0],
    ['Franck Kamga', 'Flèche', 3.7],
    ['Yannick Abena', 'Docteur', 3.3],
    ['Steve Mballa', 'Pistolet', 3.9],
    ['Rodrigue Tagne', 'Le Long', 2.9],
    ['Brice Owona', 'Ministre', 3.4],
    ['Cédric Ekane', 'Sorcier', 3.2],
    ['Patrick Nguele', 'Ndolé', 3.7],
    ['Thierry Kemajou', 'Moustique', 3.0],
    ['Ibrahim Bello', 'Sultan', 3.5],
  ]
  const pid = (i: number) => (i === 0 ? 'pp_me_dim' : `pp_dim_${i}`)
  const level = new Map(roster.map((x, i) => [pid(i), x[2]]))
  const created = addDays(today, -70)
  const players: PickupPlayer[] = roster.map(([name, nickname], i) => ({
    id: pid(i), groupId: G1, name, nickname, isMe: i === 0 || undefined, flags: [], createdAt: `${addDays(created, i)}T09:00:00.000Z`,
  }))
  const group1: PickupGroup = {
    id: G1, name: 'Foot du dimanche, Bonamoussadi', venue: lang === 'fr' ? 'Terrain de Bonamoussadi' : 'Bonamoussadi pitch', city: 'Douala', lat: 4.0905, lng: 9.7417,
    perSide: 5, defaultDay: 0, defaultTime: '08:00', defaultFee: 1000, currency: 'XAF', allowGuests: true, ratingsOn: true,
    adminIds: [pid(0), pid(2)], payHandles: { momo: '+237 670 00 00 01', orange: '+237 655 00 00 01', cash: true },
    inviteCode: 'BNM7K2', createdAt: `${created}T09:00:00.000Z`,
  }

  // who RSVP'd « going » to each of the six played Sundays (oldest first)
  const lineups: number[][] = [
    [0, 1, 2, 3, 4, 6, 7, 8, 9, 10],
    [0, 1, 2, 3, 5, 6, 7, 8, 11, 12],
    [0, 1, 2, 4, 5, 6, 7, 9, 10, 13],
    [0, 1, 3, 4, 5, 7, 8, 11, 12], // plus a guest of Bulldozer
    [0, 1, 3, 4, 5, 6, 9, 10, 12, 15],
    [0, 1, 2, 3, 4, 5, 8, 11, 13, 14],
  ]
  const scores: [number, number][] = [[5, 3], [4, 4], [2, 6], [7, 5], [3, 3], [6, 4]]
  const lateIn: Record<number, number[]> = { 2: [6], 4: [9] } // game index: late players
  const noShowIn: Record<number, number[]> = { 4: [12] }
  const unpaidIn: Record<number, number[]> = { 4: [12], 5: [13, 14] }
  const methods: PayMethod[] = ['momo', 'momo', 'orange', 'momo', 'cash', 'orange', 'momo', 'cash']

  const games: PickupGame[] = []
  const rsvps: PickupRsvpX[] = []
  const ratings: PickupRating[] = []
  lineups.forEach((ids, gi) => {
    const date = addDays(sunday, -7 * (lineups.length - gi))
    const game: PickupGame = { id: `pk_dim_${gi + 1}`, groupId: G1, date, time: '08:00', cap: 10, rsvpDeadline: iso(date, '06:00'), fee: 1000, status: 'played', createdAt: iso(addDays(date, -6), '09:00') }
    const attendees: { id: string; strength: number }[] = []
    ids.forEach((i, k) => {
      const id = pid(i)
      const noShow = noShowIn[gi]?.includes(i)
      const late = lateIn[gi]?.includes(i)
      const checkin = noShow ? undefined : late ? iso(date, '08:00', 17 + Math.round(r() * 8)) : iso(date, '08:00', -(6 + Math.round(r() * 22)))
      rsvps.push({
        id: `${game.id}:${id}`, gameId: game.id, playerId: id, status: 'going', joinedAt: iso(addDays(date, -5 + (k % 4)), '12:00', k * 7),
        checkedInAt: checkin, late: late || undefined, noShow: noShow || undefined, checkinBy: checkin ? 'self' : undefined,
        paid: unpaidIn[gi]?.includes(i) ? undefined : methods[(gi * 3 + k) % methods.length],
      })
      if (!noShow) attendees.push({ id, strength: level.get(id) ?? 3 })
    })
    if (gi === 3) {
      const gid = `guest_dim_${gi}`
      rsvps.push({ id: `${game.id}:guest:1`, gameId: game.id, playerId: gid, status: 'going', guestOf: pid(4), guestName: 'Martial', joinedAt: iso(addDays(date, -1), '20:00'), checkedInAt: iso(date, '07:50'), checkinBy: 'admin', paid: 'cash' })
      attendees.push({ id: gid, strength: 3 })
    }
    game.teams = balanceTeams(attendees)
    game.score = { a: scores[gi][0], b: scores[gi][1] }
    games.push(game)
    // anonymous peer ratings: each checked-in player rates most teammates; I have not rated last Sunday yet
    for (const team of [game.teams.a, game.teams.b]) {
      for (const from of team) {
        if (from.startsWith('guest')) continue
        for (const to of team) {
          if (to === from || to.startsWith('guest')) continue
          const isMe = from === pid(0)
          if (isMe ? gi === lineups.length - 1 : r() > 0.75) continue
          const v = Math.round((level.get(to) ?? 3) + (r() - 0.5) * 1.6)
          ratings.push({ id: `${game.id}:${from}:${to}`, gameId: game.id, from, to, score: Math.max(1, Math.min(5, v)) as PickupRating['score'], createdAt: iso(date, '11:00') })
        }
      }
    }
  })
  // the no-show of two Sundays ago is still a flag (one of three)
  const sorcier = players.find((p) => p.id === pid(12))!
  sorcier.flags = [games[4].date]

  // this Sunday: 9 going, Le Long withdrew, the freed spot is offered to Ministre (first on the waitlist), Vieux Père waits
  const next: PickupGame = { id: 'pk_dim_next', groupId: G1, date: sunday, time: '08:00', cap: 10, rsvpDeadline: iso(sunday, '06:00'), fee: 1000, status: 'open', createdAt: iso(addDays(sunday, -6), '09:00') }
  games.push(next)
  ;[0, 1, 2, 3, 4, 5, 7, 8, 9].forEach((i, k) => {
    rsvps.push({ id: `${next.id}:${pid(i)}`, gameId: next.id, playerId: pid(i), status: 'going', joinedAt: iso(addDays(sunday, -6 + Math.floor(k / 3)), '09:00', k * 11) })
  })
  rsvps.push({ id: `${next.id}:${pid(10)}`, gameId: next.id, playerId: pid(10), status: 'out', joinedAt: iso(addDays(sunday, -5), '10:00') })
  rsvps.push({ id: `${next.id}:${pid(11)}`, gameId: next.id, playerId: pid(11), status: 'waitlist', joinedAt: iso(addDays(sunday, -3), '18:30'), offerUntil: new Date(Date.now() + 15 * 60000).toISOString() })
  rsvps.push({ id: `${next.id}:${pid(6)}`, gameId: next.id, playerId: pid(6), status: 'waitlist', joinedAt: iso(addDays(sunday, -2), '21:10') })

  /* ---------------- Five du jeudi, Bastos ---------------- */
  const G2 = 'pg_bastos'
  const roster2: [string, string][] = [
    [myName, 'Coach'],
    ['Paul Biyong', 'Le Prof'],
    ['Alain Djomo', 'Petit Prince'],
    ['Moussa Hamadou', 'Sahel'],
    ['Gaëlle Ndzana', 'La Patronne'],
    ['Eric Atangana', 'Ressort'],
    ['Fabrice Ateba', 'Le Calme'],
    ['Olivier Mvondo', 'Mapane'],
  ]
  const yid = (i: number) => (i === 0 ? 'pp_me_jeu' : `pp_jeu_${i}`)
  const created2 = addDays(today, -40)
  const players2: PickupPlayer[] = roster2.map(([name, nickname], i) => ({ id: yid(i), groupId: G2, name, nickname, isMe: i === 0 || undefined, flags: [], createdAt: `${addDays(created2, i)}T18:00:00.000Z` }))
  const group2: PickupGroup = {
    id: G2, name: 'Five du jeudi, Bastos', venue: lang === 'fr' ? 'Five de Bastos' : 'Bastos five-a-side', city: 'Yaoundé', lat: 3.889, lng: 11.513,
    perSide: 5, defaultDay: 4, defaultTime: '19:00', defaultFee: 1500, currency: 'XAF', allowGuests: false, ratingsOn: false,
    adminIds: [yid(1)], payHandles: { orange: '+237 655 00 00 02', cash: true }, inviteCode: 'BST4Q9', createdAt: `${created2}T18:00:00.000Z`,
  }
  const games2: PickupGame[] = []
  ;[[4, 3], [2, 5]].forEach(([a, b], gi) => {
    const date = addDays(thursday, -7 * (2 - gi))
    const g: PickupGame = { id: `pk_jeu_${gi + 1}`, groupId: G2, date, time: '19:00', cap: 10, rsvpDeadline: iso(date, '17:00'), fee: 1500, status: 'played', createdAt: iso(addDays(date, -5), '18:00') }
    const ids = roster2.map((_, i) => yid(i))
    ids.forEach((id, k) => rsvps.push({ id: `${g.id}:${id}`, gameId: g.id, playerId: id, status: 'going', joinedAt: iso(addDays(date, -3), '12:00', k * 13), checkedInAt: iso(date, '19:00', -(4 + k * 2)), checkinBy: 'self', paid: k % 3 === 0 ? 'cash' : 'orange' }))
    g.teams = gi === 0 ? { a: [ids[0], ids[2], ids[4], ids[6]], b: [ids[1], ids[3], ids[5], ids[7]] } : { a: [ids[0], ids[3], ids[5], ids[6]], b: [ids[1], ids[2], ids[4], ids[7]] }
    g.score = { a, b }
    games2.push(g)
  })
  const next2: PickupGame = { id: 'pk_jeu_next', groupId: G2, date: thursday, time: '19:00', cap: 10, rsvpDeadline: iso(thursday, '17:00'), fee: 1500, status: 'open', createdAt: now }
  games2.push(next2)
  ;[1, 2, 3, 4, 6, 7].forEach((i, k) => rsvps.push({ id: `${next2.id}:${yid(i)}`, gameId: next2.id, playerId: yid(i), status: 'going', joinedAt: iso(addDays(thursday, -4), '20:00', k * 9) }))

  await db.transaction('rw', [db.pickupGroups, db.pickupPlayers, db.pickupGames, db.pickupRsvps, db.pickupRatings], async () => {
    await Promise.all([db.pickupGroups.clear(), db.pickupPlayers.clear(), db.pickupGames.clear(), db.pickupRsvps.clear(), db.pickupRatings.clear()])
    await db.pickupGroups.bulkPut([group1, group2])
    await db.pickupPlayers.bulkPut([...players, ...players2])
    await db.pickupGames.bulkPut([...games, ...games2])
    await db.pickupRsvps.bulkPut(rsvps)
    await db.pickupRatings.bulkPut(ratings)
  })
  // the organiser plan runs as a 30-day trial started nine days ago (a demonstration: nothing is billed)
  writeHostPlan({ kind: 'trial', start: `${addDays(today, -9)}T09:00:00.000Z` })
}
