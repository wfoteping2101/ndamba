// Pickup games (« Matchs entre amis »): the rules of a recurring friendly game, kept local on this device.
// RSVPs with a cap and a waitlist, the 15-minute offer of a freed spot, guests, minimum tier requests,
// check-in by time window and location, no-show flags and suspension, balanced teams, results,
// payments, anonymous peer ratings, tiers and the reliability score. The UI lives in src/surfaces/pickup.
import { db } from './db'
import { PICKUP } from './config'
import type { PayMethod, PickupGame, PickupGroup, PickupPlayer, PickupRating, PickupRsvp, PickupTier } from './types'
import { addDays, nowISO, todayISO, toISODate, uid } from './util'

/* ---------------- Local extensions of the stored types (extra fields on the same Dexie rows) ---------------- */

/** PickupRsvp plus the fields this feature keeps on the row (not declared in types.ts). */
export interface PickupRsvpX extends PickupRsvp {
  /** a freed spot is offered to this waitlisted player until this ISO time (15 minutes) */
  offerUntil?: string
  /** minimum tier: below it, the RSVP is a request that an organiser approves */
  pending?: boolean
  /** check-in by location: distance to the pitch in metres when it was recorded */
  distanceM?: number
  /** who recorded the check-in: the player, or an organiser (override) */
  checkinBy?: 'self' | 'admin'
}

/** The organiser plan on this device (payments are not connected: a demonstration toggle). */
export type HostPlanKind = 'none' | 'trial' | 'month' | 'year'
export interface HostPlan { kind: HostPlanKind; start?: string }

/* ---------------- Constants and thresholds ---------------- */

export const TIERS: PickupTier[] = ['bronze', 'silver', 'gold']
/**
 * Tiers, from games played (checked in) and the average peer rating:
 *   bronze: 2 games played or more
 *   silver: 3 games played or more and an average of 3.5 or more
 *   gold:   5 games played or more and an average of 4.2 or more
 * A rating average counts only from MIN_RATINGS ratings; until then the tier stops at bronze.
 */
export const TIER_RULES: Record<PickupTier, { games: number; avg: number }> = {
  bronze: { games: 2, avg: 0 },
  silver: { games: 3, avg: 3.5 },
  gold: { games: 5, avg: 4.2 },
}
export const MIN_RATINGS = 3
/** Reliability = 70 % attendance share + 30 % punctuality share. */
export const PUNCTUALITY_WEIGHT = 0.3
export const MAX_COADMINS = 3

const tierRank = (t?: PickupTier | null) => (t ? TIERS.indexOf(t) + 1 : 0)
export const tierAtLeast = (t: PickupTier | null | undefined, min?: PickupTier) => !min || tierRank(t) >= tierRank(min)

/* ---------------- Small helpers ---------------- */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newInviteCode() {
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return s
}

export const kickoff = (g: Pick<PickupGame, 'date' | 'time'>) => new Date(`${g.date}T${g.time || '00:00'}:00`)
export const isGuest = (r: PickupRsvp) => !!r.guestOf
export const isAdmin = (group: PickupGroup, playerId?: string) => !!playerId && group.adminIds.includes(playerId)
export const hostId = (group: PickupGroup) => group.adminIds[0]

/** Local date + time to an ISO instant. */
export function localISO(date: string, time: string) { return new Date(`${date}T${time || '00:00'}:00`).toISOString() }
/** HH:MM of a date in local time. */
export function hhmm(d: Date | string) { const x = typeof d === 'string' ? new Date(d) : d; return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}` }

/** The next date (from today, today included) that falls on this weekday. */
export function nextWeekday(dow: number, from = todayISO()) {
  const d = new Date(`${from}T00:00:00`)
  const diff = (dow - d.getDay() + 7) % 7
  return addDays(from, diff)
}

/** Money of a pickup group: FCFA without decimals, dollars and euros with two. */
export function fmtMoney(amount: number, currency: PickupGroup['currency'] = 'XAF', lang: 'fr' | 'en' = 'fr') {
  const loc = lang === 'fr' ? 'fr-FR' : 'en-US'
  if (currency === 'XAF') return `${new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(Math.round(amount))} FCFA`
  return new Intl.NumberFormat(loc, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

/** Great-circle distance in metres. */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000, rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

/** The code to write in the note of a Mobile Money transfer, so the organiser knows what it pays. */
export function matchCode(game: PickupGame, group: PickupGroup) {
  const [, m, d] = game.date.split('-')
  return `${group.inviteCode.slice(0, 3)}-${d}${m}`
}

/* ---------------- Game state ---------------- */

export interface GameState {
  going: PickupRsvpX[]
  waitlist: PickupRsvpX[] // in order, offered first
  pending: PickupRsvpX[]
  offered: PickupRsvpX[]
  out: PickupRsvpX[]
  spotsLeft: number
}

const byJoined = (a: PickupRsvp, b: PickupRsvp) => a.joinedAt.localeCompare(b.joinedAt)

export function gameState(game: PickupGame, rsvps: PickupRsvpX[]): GameState {
  const mine = rsvps.filter((r) => r.gameId === game.id)
  const going = mine.filter((r) => r.status === 'going').sort(byJoined)
  const pending = mine.filter((r) => r.status === 'waitlist' && r.pending).sort(byJoined)
  const waiting = mine.filter((r) => r.status === 'waitlist' && !r.pending).sort(byJoined)
  const offered = waiting.filter((r) => r.offerUntil)
  const waitlist = [...offered, ...waiting.filter((r) => !r.offerUntil)]
  const out = mine.filter((r) => r.status === 'out')
  return { going, waitlist, pending, offered, out, spotsLeft: Math.max(0, game.cap - going.length - offered.length) }
}

export function checkinWindow(game: PickupGame) {
  const k = kickoff(game).getTime()
  return { kickoff: k, opens: k - PICKUP.checkinBefore * 60000, closes: k + PICKUP.checkinAfter * 60000, lateAfter: k + PICKUP.lateAfter * 60000 }
}
export type Phase = 'before' | 'checkin' | 'after'
export function gamePhase(game: PickupGame, now = Date.now()): Phase {
  const w = checkinWindow(game)
  if (now < w.opens) return 'before'
  if (now <= w.closes) return 'checkin'
  return 'after'
}
export const deadlinePassed = (game: PickupGame, now = Date.now()) => !!game.rsvpDeadline && now > new Date(game.rsvpDeadline).getTime()

/* ---------------- Flags and suspension ---------------- */

export function recentFlags(p: PickupPlayer, today = todayISO()) {
  const since = addDays(today, -PICKUP.flagDays)
  return p.flags.filter((f) => f > since)
}
export function isSuspended(p: PickupPlayer, today = todayISO()) {
  return (!!p.suspendedUntil && p.suspendedUntil >= today) || recentFlags(p, today).length >= PICKUP.flagsToSuspend
}
function withSuspension(p: PickupPlayer, today = todayISO()): Pick<PickupPlayer, 'flags' | 'suspendedUntil'> {
  const recent = recentFlags(p, today).sort()
  const suspendedUntil = recent.length >= PICKUP.flagsToSuspend ? addDays(recent[recent.length - 1], PICKUP.flagDays) : undefined
  return { flags: p.flags, suspendedUntil }
}
/** Organiser: clear every flag and lift the suspension. */
export async function clearFlags(playerId: string) {
  await db.pickupPlayers.update(playerId, { flags: [], suspendedUntil: undefined })
}
/** Organiser: remove one flag (by its date). */
export async function removeFlag(playerId: string, date: string) {
  const p = await db.pickupPlayers.get(playerId)
  if (!p) return
  const i = p.flags.indexOf(date)
  const flags = i >= 0 ? [...p.flags.slice(0, i), ...p.flags.slice(i + 1)] : p.flags
  await db.pickupPlayers.update(playerId, withSuspension({ ...p, flags }))
}

/* ---------------- Stats: W-D-L, ratings, tier, reliability ---------------- */

export interface PlayerStats {
  committed: number // RSVP'd « going » to games that are over
  attended: number // of those, checked in
  noShows: number
  late: number
  onTime: number
  played: number // games played (checked in), for the tier
  w: number; d: number; l: number
  ratingCount: number
  avg: number | null // only when ratingCount >= MIN_RATINGS
  rawAvg: number | null
  attendance: number | null // 0..1
  punctuality: number | null // 0..1
  reliability: number | null // 0..100
  tier: PickupTier | null
  guests: number
  recent: { game: PickupGame; rsvp: PickupRsvpX; result: 'W' | 'D' | 'L' | null; team: 'a' | 'b' | null }[]
}

export function resultFor(game: PickupGame, playerId: string): { team: 'a' | 'b' | null; result: 'W' | 'D' | 'L' | null } {
  const team = game.teams?.a.includes(playerId) ? 'a' : game.teams?.b.includes(playerId) ? 'b' : null
  if (!team || !game.score || game.status !== 'played') return { team, result: null }
  const mine = team === 'a' ? game.score.a : game.score.b
  const theirs = team === 'a' ? game.score.b : game.score.a
  return { team, result: mine > theirs ? 'W' : mine < theirs ? 'L' : 'D' }
}

export function tierFor(played: number, avg: number | null): PickupTier | null {
  if (played >= TIER_RULES.gold.games && avg !== null && avg >= TIER_RULES.gold.avg) return 'gold'
  if (played >= TIER_RULES.silver.games && avg !== null && avg >= TIER_RULES.silver.avg) return 'silver'
  if (played >= TIER_RULES.bronze.games) return 'bronze'
  return null
}

export function reliabilityOf(attendance: number | null, punctuality: number | null) {
  if (attendance === null) return null
  return Math.round(100 * ((1 - PUNCTUALITY_WEIGHT) * attendance + PUNCTUALITY_WEIGHT * (punctuality ?? 0)))
}

/** Whether a game is over for the stats: played, or its check-in window has closed. */
export const gameOver = (g: PickupGame, now = Date.now()) => g.status === 'played' || (g.status === 'open' && now > checkinWindow(g).closes)

export function playerStats(playerId: string, games: PickupGame[], rsvps: PickupRsvpX[], ratings: PickupRating[], opts: { now?: number; since?: string | null } = {}): PlayerStats {
  const now = opts.now ?? Date.now()
  const gById = new Map(games.map((g) => [g.id, g]))
  const inRange = (g: PickupGame) => !opts.since || g.date >= opts.since
  const mine = rsvps.filter((r) => r.playerId === playerId && !r.guestOf)
  let committed = 0, attended = 0, noShows = 0, late = 0, w = 0, d = 0, l = 0
  const recent: PlayerStats['recent'] = []
  for (const r of mine) {
    const g = gById.get(r.gameId)
    if (!g || g.status === 'cancelled' || !inRange(g) || r.status !== 'going' || !gameOver(g, now)) continue
    committed++
    if (r.checkedInAt) { attended++; if (r.late) late++ }
    if (r.noShow) noShows++
    // a no-show does not share the result of the team they were drawn in
    const res = r.noShow ? { team: null, result: null } : resultFor(g, playerId)
    if (res.result === 'W') w++
    else if (res.result === 'D') d++
    else if (res.result === 'L') l++
    recent.push({ game: g, rsvp: r, result: res.result, team: res.team })
  }
  recent.sort((a, b) => (b.game.date + b.game.time).localeCompare(a.game.date + a.game.time))
  const got = ratings.filter((x) => x.to === playerId && (!opts.since || (gById.get(x.gameId)?.date ?? '') >= opts.since))
  const rawAvg = got.length ? got.reduce((a, x) => a + x.score, 0) / got.length : null
  const avg = got.length >= MIN_RATINGS ? rawAvg : null
  const attendance = committed ? attended / committed : null
  const punctuality = attended ? (attended - late) / attended : committed ? 0 : null
  const guests = rsvps.filter((r) => r.guestOf === playerId && r.status === 'going' && (() => { const g = gById.get(r.gameId); return !!g && g.status !== 'cancelled' && inRange(g) && gameOver(g, now) })()).length
  return {
    committed, attended, noShows, late, onTime: attended - late, played: attended, w, d, l,
    ratingCount: got.length, avg, rawAvg, attendance, punctuality, reliability: reliabilityOf(attendance, punctuality),
    tier: tierFor(attended, avg), guests, recent,
  }
}

/* ---------------- Teams ---------------- */

/** Strength used to balance teams: the applied rating average (or 3), plus a little for the tier. */
export function strengthOf(s: Pick<PlayerStats, 'avg' | 'tier'> | null | undefined) {
  const bonus = s?.tier === 'gold' ? 0.3 : s?.tier === 'silver' ? 0.15 : s?.tier === 'bronze' ? 0.05 : 0
  return (s?.avg ?? 3) + bonus
}

/** Greedy balance: strongest first, each to the team with the lower total while sizes stay within one. */
export function balanceTeams(entries: { id: string; strength: number }[]): { a: string[]; b: string[] } {
  const sorted = [...entries].sort((x, y) => y.strength - x.strength || x.id.localeCompare(y.id))
  const a: string[] = [], b: string[] = []
  let sa = 0, sb = 0
  const half = Math.ceil(sorted.length / 2)
  for (const e of sorted) {
    const toA = a.length >= half ? false : b.length >= half ? true : sa <= sb
    if (toA) { a.push(e.id); sa += e.strength } else { b.push(e.id); sb += e.strength }
  }
  return { a, b }
}

/* ---------------- Writes: groups and members ---------------- */

export interface GroupInput {
  name: string; venue: string; city?: string; lat?: number; lng?: number
  perSide: number; defaultDay?: number; defaultTime?: string; defaultFee?: number; currency: PickupGroup['currency']
  minTier?: PickupTier; allowGuests: boolean; ratingsOn: boolean
  payHandles: PickupGroup['payHandles']
}

export async function createGroup(input: GroupInput, me: { name: string; nickname?: string }) {
  const now = nowISO()
  const meId = uid('pp_')
  const group: PickupGroup = { id: uid('pg_'), ...input, adminIds: [meId], inviteCode: newInviteCode(), createdAt: now }
  const player: PickupPlayer = { id: meId, groupId: group.id, name: me.name, nickname: me.nickname || me.name.split(' ')[0] || me.name, isMe: true, flags: [], createdAt: now }
  await db.transaction('rw', db.pickupGroups, db.pickupPlayers, async () => {
    await db.pickupGroups.put(group)
    await db.pickupPlayers.put(player)
  })
  return group
}

export async function updateGroup(id: string, patch: Partial<PickupGroup>) { await db.pickupGroups.update(id, patch) }

export async function addMember(groupId: string, p: { name: string; nickname?: string; phone?: string }) {
  const player: PickupPlayer = { id: uid('pp_'), groupId, name: p.name.trim(), nickname: (p.nickname || p.name.split(' ')[0]).trim(), phone: p.phone?.trim() || undefined, flags: [], createdAt: nowISO() }
  await db.pickupPlayers.put(player)
  return player
}

export async function updateMember(id: string, patch: Partial<PickupPlayer>) { await db.pickupPlayers.update(id, patch) }

/** Remove a member: their future RSVPs are released (the spot goes to the waitlist); past records stay for the history. */
export async function removeMember(group: PickupGroup, playerId: string) {
  const games = await db.pickupGames.where('groupId').equals(group.id).toArray()
  const future = games.filter((g) => g.status === 'open' && !gameOver(g)).map((g) => g.id)
  for (const gid of future) await leaveGame(gid, playerId)
  await db.pickupGroups.update(group.id, { adminIds: group.adminIds.filter((x) => x !== playerId || x === hostId(group)) })
  await db.pickupPlayers.delete(playerId)
}

/** Join a group of this device by its invite code. Returns the group id, or null when no group has this code here. */
export async function joinByCode(code: string, me: { name: string; nickname?: string }) {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!clean) return null
  const group = await db.pickupGroups.where('inviteCode').equals(clean).first()
  if (!group) return null
  const players = await db.pickupPlayers.where('groupId').equals(group.id).toArray()
  if (!players.some((p) => p.isMe)) {
    await db.pickupPlayers.put({ id: uid('pp_'), groupId: group.id, name: me.name, nickname: me.nickname || me.name.split(' ')[0] || me.name, isMe: true, flags: [], createdAt: nowISO() })
  }
  return group.id
}

/** Delete a group and everything in it (host only). */
export async function deleteGroup(groupId: string) {
  const games = await db.pickupGames.where('groupId').equals(groupId).toArray()
  const ids = games.map((g) => g.id)
  await db.transaction('rw', [db.pickupGroups, db.pickupPlayers, db.pickupGames, db.pickupRsvps, db.pickupRatings], async () => {
    if (ids.length) {
      await db.pickupRsvps.where('gameId').anyOf(ids).delete()
      await db.pickupRatings.where('gameId').anyOf(ids).delete()
    }
    await db.pickupGames.where('groupId').equals(groupId).delete()
    await db.pickupPlayers.where('groupId').equals(groupId).delete()
    await db.pickupGroups.delete(groupId)
  })
}

/* ---------------- Writes: games ---------------- */

export async function createGame(groupId: string, p: { date: string; time: string; cap: number; rsvpDeadline?: string; fee: number; note?: string }) {
  const game: PickupGame = { id: uid('pk_'), groupId, date: p.date, time: p.time, cap: Math.max(2, Math.round(p.cap)), rsvpDeadline: p.rsvpDeadline, fee: Math.max(0, p.fee), status: 'open', note: p.note?.trim() || undefined, createdAt: nowISO() }
  await db.pickupGames.put(game)
  return game
}
export async function updateGame(id: string, patch: Partial<PickupGame>) { await db.pickupGames.update(id, patch) }
export async function cancelGame(id: string) {
  await db.pickupGames.update(id, { status: 'cancelled' })
  const rs = (await db.pickupRsvps.where('gameId').equals(id).toArray()) as PickupRsvpX[]
  for (const r of rs) if (r.offerUntil) await db.pickupRsvps.update(r.id, { offerUntil: undefined } as Partial<PickupRsvpX>)
}
export async function reopenGame(id: string) {
  await db.pickupGames.update(id, { status: 'open', score: undefined })
  await offerNext(id)
}

/* ---------------- Writes: RSVPs, waitlist and offers ---------------- */

export type RsvpResult = 'going' | 'waitlist' | 'pending' | 'deadline' | 'suspended' | 'closed' | 'already'

async function load(gameId: string) {
  const game = await db.pickupGames.get(gameId)
  if (!game) return null
  const group = await db.pickupGroups.get(game.groupId)
  const rsvps = (await db.pickupRsvps.where('gameId').equals(gameId).toArray()) as PickupRsvpX[]
  return group ? { game, group, rsvps } : null
}

/**
 * RSVP « going » for a member. Rules: the game must be open; the deadline holds unless an organiser adds the player;
 * a suspended player cannot RSVP; below the group's minimum tier, it becomes a request (unless an organiser adds them);
 * beyond the cap, the player joins the end of the waitlist.
 */
export async function rsvpGoing(gameId: string, playerId: string, opts: { byAdmin?: boolean; tier?: PickupTier | null; now?: number } = {}): Promise<RsvpResult> {
  const ctx = await load(gameId)
  if (!ctx) return 'closed'
  const { game, group, rsvps } = ctx
  const now = opts.now ?? Date.now()
  if (game.status !== 'open' || gamePhase(game, now) === 'after') return 'closed'
  const existing = rsvps.find((r) => r.playerId === playerId && !r.guestOf)
  if (existing && existing.status !== 'out') return 'already'
  if (!opts.byAdmin && deadlinePassed(game, now)) return 'deadline'
  const player = await db.pickupPlayers.get(playerId)
  if (!player) return 'closed'
  if (isSuspended(player)) return 'suspended'
  const st = gameState(game, rsvps)
  const base: PickupRsvpX = { id: `${gameId}:${playerId}`, gameId, playerId, status: 'going', joinedAt: new Date(now).toISOString() }
  if (!opts.byAdmin && group.minTier && !tierAtLeast(opts.tier ?? null, group.minTier)) {
    await db.pickupRsvps.put({ ...base, status: 'waitlist', pending: true } as PickupRsvpX)
    return 'pending'
  }
  const status = st.spotsLeft > 0 && st.waitlist.length === 0 ? 'going' : 'waitlist'
  await db.pickupRsvps.put({ ...base, status })
  return status
}

/** Bring a +1: the guest takes a real spot attributed to the player, never ahead of the waitlist. */
export async function addGuest(gameId: string, hostPlayerId: string, guestName: string, now = Date.now()): Promise<RsvpResult> {
  const ctx = await load(gameId)
  if (!ctx) return 'closed'
  const { game, group, rsvps } = ctx
  if (!group.allowGuests || game.status !== 'open' || gamePhase(game, now) === 'after') return 'closed'
  const st = gameState(game, rsvps)
  const n = rsvps.filter((r) => r.guestOf).length + 1
  const status = st.spotsLeft > 0 && st.waitlist.length === 0 ? 'going' : 'waitlist'
  const r: PickupRsvpX = { id: `${gameId}:guest:${n}:${uid()}`, gameId, playerId: `guest_${uid()}`, status, guestOf: hostPlayerId, guestName: guestName.trim(), joinedAt: new Date(now).toISOString() }
  await db.pickupRsvps.put(r)
  return status
}

/** Leave (or remove a guest): a freed « going » spot is offered to the first person waiting. */
export async function leaveGame(gameId: string, playerId: string, now = Date.now()) {
  const ctx = await load(gameId)
  if (!ctx) return
  const r = ctx.rsvps.find((x) => x.playerId === playerId)
  if (!r || r.status === 'out') return
  await db.pickupRsvps.update(r.id, { status: 'out', offerUntil: undefined, pending: undefined } as Partial<PickupRsvpX>)
  // a guest of this player stays: they were brought, the organiser can remove them
  await offerNext(gameId, now)
}
export async function removeRsvp(rsvpId: string, now = Date.now()) {
  const r = await db.pickupRsvps.get(rsvpId)
  if (!r) return
  if (r.guestOf) await db.pickupRsvps.delete(rsvpId)
  else await db.pickupRsvps.update(rsvpId, { status: 'out', offerUntil: undefined, pending: undefined } as Partial<PickupRsvpX>)
  await offerNext(r.gameId, now)
}

/** A free spot while people wait without an offer (a cancelled game reopened, a record edited): it should be offered. */
export function needsOffer(game: PickupGame, rsvps: PickupRsvpX[], now = Date.now()) {
  if (game.status !== 'open' || gamePhase(game, now) === 'after') return false
  const st = gameState(game, rsvps)
  return st.spotsLeft > 0 && st.waitlist.some((r) => !r.offerUntil)
}

/** Offer every free spot to the next people waiting, for PICKUP.waitlistMinutes each. */
export async function offerNext(gameId: string, now = Date.now()) {
  const ctx = await load(gameId)
  if (!ctx || ctx.game.status !== 'open') return
  let st = gameState(ctx.game, ctx.rsvps)
  const queue = st.waitlist.filter((r) => !r.offerUntil)
  const until = new Date(now + PICKUP.waitlistMinutes * 60000).toISOString()
  while (st.spotsLeft > 0 && queue.length) {
    const next = queue.shift()!
    await db.pickupRsvps.update(next.id, { offerUntil: until } as Partial<PickupRsvpX>)
    next.offerUntil = until
    st = { ...st, offered: [...st.offered, next], spotsLeft: st.spotsLeft - 1 }
  }
}

/** The offered player takes the spot (or the organiser confirms it for them). */
export async function confirmOffer(rsvpId: string) {
  await db.pickupRsvps.update(rsvpId, { status: 'going', offerUntil: undefined } as Partial<PickupRsvpX>)
}

/** Pass the offer to the next person: the current one goes back to the end of the waitlist. */
export async function passOffer(rsvpId: string, now = Date.now()) {
  const r = await db.pickupRsvps.get(rsvpId)
  if (!r) return
  await db.pickupRsvps.update(rsvpId, { offerUntil: undefined, joinedAt: new Date(now).toISOString() } as Partial<PickupRsvpX>)
  await offerNext(r.gameId, now)
}

/** Minimum tier: the organiser approves a request (the player is placed by the usual rules) or declines it. */
export async function approveRequest(rsvpId: string, now = Date.now()) {
  const r = (await db.pickupRsvps.get(rsvpId)) as PickupRsvpX | undefined
  if (!r) return
  const ctx = await load(r.gameId)
  if (!ctx) return
  const st = gameState(ctx.game, ctx.rsvps)
  const status = st.spotsLeft > 0 && st.waitlist.length === 0 ? 'going' : 'waitlist'
  await db.pickupRsvps.update(rsvpId, { pending: undefined, status, joinedAt: new Date(now).toISOString() } as Partial<PickupRsvpX>)
}
export async function declineRequest(rsvpId: string) {
  await db.pickupRsvps.update(rsvpId, { pending: undefined, status: 'out' } as Partial<PickupRsvpX>)
}

/* ---------------- Check-in, lateness and no-shows ---------------- */

export async function checkIn(rsvpId: string, opts: { by: 'self' | 'admin'; distanceM?: number; now?: number }) {
  const r = await db.pickupRsvps.get(rsvpId)
  if (!r) return
  const game = await db.pickupGames.get(r.gameId)
  if (!game) return
  const now = opts.now ?? Date.now()
  const w = checkinWindow(game)
  // an organiser recording someone after the window keeps the kick-off as the time (present, not late)
  const at = now > w.closes ? w.kickoff : now
  const patch: Partial<PickupRsvpX> = { checkedInAt: new Date(at).toISOString(), late: at > w.lateAfter, checkinBy: opts.by, distanceM: opts.distanceM }
  // a no-show recorded by mistake: the flag goes away with it
  if (r.noShow) {
    patch.noShow = false
    if (!r.guestOf) await removeFlag(r.playerId, game.date)
  }
  await db.pickupRsvps.update(rsvpId, patch)
}
export async function undoCheckIn(rsvpId: string) {
  await db.pickupRsvps.update(rsvpId, { checkedInAt: undefined, late: undefined, checkinBy: undefined, distanceM: undefined } as Partial<PickupRsvpX>)
}
export async function setLate(rsvpId: string, late: boolean) { await db.pickupRsvps.update(rsvpId, { late }) }

/**
 * After the check-in window: every « going » player who did not check in gets a no-show and a flag dated on the game.
 * Three flags within PICKUP.flagDays suspend RSVPs. Idempotent; guests are marked but never flagged.
 */
const settling = new Set<string>()
export async function settleGame(gameId: string, now = Date.now()) {
  if (settling.has(gameId)) return 0
  settling.add(gameId)
  try {
    return await db.transaction('rw', [db.pickupGames, db.pickupGroups, db.pickupRsvps, db.pickupPlayers], async () => {
      const ctx = await load(gameId)
      if (!ctx) return 0
      const { game, rsvps } = ctx
      if (game.status === 'cancelled' || gamePhase(game, now) !== 'after') return 0
      let n = 0
      for (const r of rsvps) {
        if (r.offerUntil) await db.pickupRsvps.update(r.id, { offerUntil: undefined } as Partial<PickupRsvpX>)
        if (r.status !== 'going' || r.checkedInAt || r.noShow) continue
        await db.pickupRsvps.update(r.id, { noShow: true })
        n++
        if (r.guestOf) continue
        const p = await db.pickupPlayers.get(r.playerId)
        if (p) {
          const flags = [...p.flags, game.date]
          await db.pickupPlayers.update(p.id, withSuspension({ ...p, flags }))
        }
      }
      return n
    })
  } finally {
    settling.delete(gameId)
  }
}

/** Whether a game still needs settling (window over, someone « going » neither checked in nor marked absent, or an offer left). */
export function needsSettle(game: PickupGame, rsvps: PickupRsvpX[], now = Date.now()) {
  if (game.status === 'cancelled' || gamePhase(game, now) !== 'after') return false
  return rsvps.some((r) => r.gameId === game.id && ((r.status === 'going' && !r.checkedInAt && !r.noShow) || r.offerUntil))
}

/** Organiser: the player was there after all (or excused): the no-show and its flag go away. */
export async function excuseNoShow(rsvpId: string) {
  const r = await db.pickupRsvps.get(rsvpId)
  if (!r || !r.noShow) return
  const game = await db.pickupGames.get(r.gameId)
  await db.pickupRsvps.update(rsvpId, { noShow: false })
  if (game && !r.guestOf) await removeFlag(r.playerId, game.date)
}

/* ---------------- Teams, result, payments, ratings ---------------- */

export async function setTeams(gameId: string, teams: { a: string[]; b: string[] } | undefined) { await db.pickupGames.update(gameId, { teams }) }
export async function setScore(gameId: string, score: { a: number; b: number }) { await db.pickupGames.update(gameId, { score, status: 'played' }) }
export async function setPaid(rsvpId: string, paid: PayMethod | undefined) { await db.pickupRsvps.update(rsvpId, { paid }) }

export async function rate(gameId: string, from: string, to: string, score: 1 | 2 | 3 | 4 | 5) {
  await db.pickupRatings.put({ id: `${gameId}:${from}:${to}`, gameId, from, to, score, createdAt: nowISO() })
}

/** Teammates a player can rate after a played game: both checked in, same team. */
export function teammatesToRate(game: PickupGame, rsvps: PickupRsvpX[], me: string) {
  if (game.status !== 'played' || !game.teams) return []
  const team = game.teams.a.includes(me) ? game.teams.a : game.teams.b.includes(me) ? game.teams.b : null
  if (!team) return []
  const mine = rsvps.find((r) => r.gameId === game.id && r.playerId === me)
  if (!mine?.checkedInAt) return []
  const checked = new Set(rsvps.filter((r) => r.gameId === game.id && r.checkedInAt && !r.guestOf).map((r) => r.playerId))
  return team.filter((id) => id !== me && checked.has(id))
}

/* ---------------- Payments summary ---------------- */

export function paymentSummary(game: PickupGame, rsvps: PickupRsvpX[]) {
  const due = rsvps.filter((r) => r.gameId === game.id && r.status === 'going')
  const paid = due.filter((r) => r.paid && r.paid !== 'waived')
  const waived = due.filter((r) => r.paid === 'waived')
  const unpaid = due.filter((r) => !r.paid)
  return { due: due.length, paid: paid.length, waived: waived.length, unpaid: unpaid.length, collected: paid.length * game.fee, outstanding: unpaid.length * game.fee, settled: paid.length + waived.length }
}

/* ---------------- Season summary (organisers) ---------------- */

export interface SeasonRow {
  player: PickupPlayer
  stats: PlayerStats
  owed: number // fees not paid yet (own spot and guests)
  paidAmount: number
}

export function seasonSummary(players: PickupPlayer[], games: PickupGame[], rsvps: PickupRsvpX[], ratings: PickupRating[], since: string | null, now = Date.now()) {
  const gById = new Map(games.map((g) => [g.id, g]))
  const counted = (r: PickupRsvpX) => {
    const g = gById.get(r.gameId)
    return !!g && g.status !== 'cancelled' && gameOver(g, now) && (!since || g.date >= since) && r.status === 'going'
  }
  const rows: SeasonRow[] = players.map((p) => {
    const stats = playerStats(p.id, games, rsvps, ratings, { now, since })
    let owed = 0, paidAmount = 0
    for (const r of rsvps) {
      if (!counted(r)) continue
      const payer = r.guestOf ?? r.playerId
      if (payer !== p.id) continue
      const fee = gById.get(r.gameId)!.fee
      if (!r.paid) owed += fee
      else if (r.paid !== 'waived') paidAmount += fee
    }
    return { player: p, stats, owed, paidAmount }
  })
  const totals = rows.reduce((a, r) => ({
    committed: a.committed + r.stats.committed, attended: a.attended + r.stats.attended, noShows: a.noShows + r.stats.noShows,
    late: a.late + r.stats.late, owed: a.owed + r.owed, paid: a.paid + r.paidAmount, guests: a.guests + r.stats.guests,
  }), { committed: 0, attended: 0, noShows: 0, late: 0, owed: 0, paid: 0, guests: 0 })
  const gamesPlayed = games.filter((g) => g.status !== 'cancelled' && gameOver(g, now) && (!since || g.date >= since)).length
  return { rows, totals, gamesPlayed, attendanceRate: totals.committed ? totals.attended / totals.committed : null }
}

/** CSV with a byte order mark (Excel opens UTF-8 correctly). French uses semicolons, English commas. */
export function toCSV(rows: (string | number)[][], lang: 'fr' | 'en' = 'fr') {
  const sep = lang === 'fr' ? ';' : ','
  const cell = (v: string | number) => {
    const s = typeof v === 'number' ? (lang === 'fr' ? String(v).replace('.', ',') : String(v)) : v
    return /[";,\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + rows.map((r) => r.map(cell).join(sep)).join('\r\n')
}

/* ---------------- Organiser plan (demonstration until payments are connected) ---------------- */

const PLAN_KEY = 'njangi.pickup.host'
export function readHostPlan(): HostPlan {
  try { const v = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null'); if (v && v.kind) return v } catch { /* storage unavailable */ }
  return { kind: 'none' }
}
export function writeHostPlan(p: HostPlan) {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(p)); window.dispatchEvent(new Event('njangi-pickup-plan')) } catch { /* storage unavailable */ }
}
export function hostAccess(p: HostPlan, today = todayISO()) {
  if (p.kind === 'month' || p.kind === 'year') return { active: true, daysLeft: null as number | null }
  if (p.kind === 'trial' && p.start) {
    const end = addDays(p.start.slice(0, 10), PICKUP.trialDays)
    const left = Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
    return { active: left > 0, daysLeft: Math.max(0, left) }
  }
  return { active: false, daysLeft: null as number | null }
}

/* ---------------- Misc ---------------- */

export const todayAt = (time: string) => localISO(todayISO(), time)
export const dateOf = (d: Date) => toISODate(d)
