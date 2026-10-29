// Automatic coding of the simulation with the fourteen codes of Le Code Njangi, chapter 32,
// exactly as the book defines them (chapter 33: "une action, plusieurs boutons"):
//   PASS_OK    any pass that reaches a teammate
//   PASS_LOST  intercepted, too long, out of play
//   PROG       pass or carry of at least 10 m towards the opponent goal (added to PASS_OK for a pass)
//   LINE       replaces PROG when the ball goes beyond a line of at least two opponents and a teammate controls it
//   FINAL3     ball controlled in the last 35 m, once per entry
//   BOX        ball controlled in the opponent box, by a received pass or a carry
//   FIX2       dribble or carry that draws two opponents, and the ball stays ours
//   SWITCH     the ball changes side after the block was drawn; added to PASS_OK
//   LOSS       any loss that is not a pass: duel, dribble, missed control
//   REGAIN5    ball won back within 5 seconds after a PASS_LOST or a LOSS
//   REGAIN     any other recovery
//   SHOT, SHOT_IN (forces the keeper or goes in), GOAL (adds to SHOT and SHOT_IN)
// The Indice itself is then computed by the app's own src/lib/njangi.ts (book-exact).
import type { EventCode } from '../../../lib/types'
import { EVENT_CODES } from '../../../lib/njangi'
import { dist2, type V2 } from './math'
import { defensiveLines, linesBetween, type Line } from './lanes'
import { inBox, inFinalThird } from './pitch'
import type { SimEvent } from './types'
import type { World } from './world'

export interface TaggedAction { t: number; code: EventCode; side: 'a' | 'b'; by: string | null; at: V2 }

export class Tagger {
  counts: Record<'a' | 'b', Record<EventCode, number>>
  log: TaggedAction[] = []
  private linesAtKick: Line[] = []
  private blockDrawnAtKick = false
  private kickStart: V2 | null = null
  private inF3: Record<'a' | 'b', boolean> = { a: false, b: false }
  private inBox: Record<'a' | 'b', boolean> = { a: false, b: false }
  private carry: { by: string; side: 'a' | 'b'; start: V2; drew2: boolean; linesAtStart: Line[] } | null = null
  private shotOpen: { side: 'a' | 'b'; inCounted: boolean } | null = null
  private off: () => void

  constructor(private w: World) {
    const z = () => Object.fromEntries(EVENT_CODES.map((c) => [c, 0])) as Record<EventCode, number>
    this.counts = { a: z(), b: z() }
    this.off = w.on((e) => this.onEvent(e))
  }
  dispose() { this.off() }

  private add(side: string | null | undefined, code: EventCode, by: string | null, at: V2) {
    if (side !== 'a' && side !== 'b') return
    this.counts[side][code]++
    this.log.push({ t: this.w.t, code, side, by, at: { ...at } })
  }
  private sideOfTeam(team: string | null | undefined): 'a' | 'b' | null {
    if (team === 'a' || team === 'b') return team
    if (team === 'n') return this.w.possTeam
    return null
  }
  private towardsGoal(side: 'a' | 'b', a: V2, b: V2) { return side === 'a' ? b.x - a.x : a.x - b.x }

  /** Call every tick: tracks carries (PROG/LINE by dribble, FIX2) and controlled entries (FINAL3/BOX). */
  update() {
    const w = this.w
    const own = w.owner()
    const side = own ? this.sideOfTeam(own.team) : null
    if (own && side) {
      if (!this.carry || this.carry.by !== own.id) {
        this.closeCarry(false)
        this.carry = { by: own.id, side, start: w.ball2(), drew2: false, linesAtStart: defensiveLines(w.opponents(own), side) }
      }
      // two opponents drawn onto the carrier
      let close = 0
      for (const o of w.opponents(own)) if (dist2(o.pos, own.pos) < 3.2) close++
      if (close >= 2) this.carry.drew2 = true
      // controlled entries
      const bp = w.ball2()
      const f3 = inFinalThird(w.pitch, bp, side), bx = inBox(w.pitch, bp, side)
      if (f3 && !this.inF3[side]) { this.add(side, 'FINAL3', own.id, bp); this.inF3[side] = true }
      if (!f3) this.inF3[side] = false
      if (bx && !this.inBox[side]) { this.add(side, 'BOX', own.id, bp); this.inBox[side] = true }
      if (!bx) this.inBox[side] = false
    }
  }

  /** A carry ends: when the carrier passes, loses it, or someone else takes the ball. */
  private closeCarry(lost: boolean) {
    const c = this.carry
    this.carry = null
    if (!c) return
    const w = this.w
    const p = w.get(c.by)
    const end = p ? w.ball2() : c.start
    if (lost) return // a carry that ends in a loss only counts LOSS (chapter 33)
    const gain = this.towardsGoal(c.side, c.start, end)
    const lines = linesBetween(c.linesAtStart, c.start, end, c.side)
    if (lines > 0) this.add(c.side, 'LINE', c.by, end)
    else if (gain >= 10) this.add(c.side, 'PROG', c.by, end)
    if (c.drew2) this.add(c.side, 'FIX2', c.by, end)
  }

  private onEvent(e: SimEvent) {
    const w = this.w
    switch (e.type) {
      case 'kick': {
        const side = this.sideOfTeam(e.team)
        if (e.kind === 'shot') return
        this.closeCarry(false)
        if (!side) return
        const passer = w.get(e.by)
        const opps = passer ? w.opponents(passer) : []
        this.linesAtKick = defensiveLines(opps, side)
        this.kickStart = { ...e.from }
        // the block is "drawn" when most outfield opponents are on the ball's side of the pitch
        const field = opps.filter((o) => !o.gk)
        const mid = w.pitch.h / 2
        const ballTop = e.from.y < mid
        const sameSide = field.filter((o) => (o.pos.y < mid) === ballTop).length
        this.blockDrawnAtKick = field.length >= 3 && sameSide / field.length >= 0.6
        return
      }
      case 'pass_complete': {
        const side = this.sideOfTeam(e.team)
        if (!side) return
        this.add(side, 'PASS_OK', e.from, e.end)
        const start = this.kickStart ?? e.start
        const lines = linesBetween(this.linesAtKick, start, e.end, side)
        if (lines > 0) this.add(side, 'LINE', e.from, e.end)
        else if (this.towardsGoal(side, start, e.end) >= 10) this.add(side, 'PROG', e.from, e.end)
        const mid = w.pitch.h / 2
        if (this.blockDrawnAtKick && (start.y < mid) !== (e.end.y < mid) && Math.abs(e.end.y - start.y) > w.pitch.h / 3) this.add(side, 'SWITCH', e.from, e.end)
        return
      }
      case 'pass_lost': {
        this.add(this.sideOfTeam(e.team), 'PASS_LOST', e.from, e.end)
        return
      }
      case 'loss': {
        this.closeCarry(true)
        this.add(e.team === 'n' ? null : (e.team as 'a' | 'b'), 'LOSS', e.by, w.ball2())
        return
      }
      case 'regain': {
        if (e.team === 'a' || e.team === 'b') this.add(e.team, e.within5 ? 'REGAIN5' : 'REGAIN', e.by, e.at)
        return
      }
      case 'shot': {
        this.closeCarry(false)
        const side = this.sideOfTeam(e.team)
        if (!side) return
        this.add(side, 'SHOT', e.by, e.from)
        this.shotOpen = { side, inCounted: false }
        return
      }
      case 'save': {
        if (this.shotOpen && !this.shotOpen.inCounted) { this.add(this.shotOpen.side, 'SHOT_IN', e.by, w.ball2()); this.shotOpen.inCounted = true }
        return
      }
      case 'goal': {
        const side = e.team
        if (this.shotOpen && this.shotOpen.side === side) {
          if (!this.shotOpen.inCounted) this.add(side, 'SHOT_IN', e.by, w.ball2())
        } else {
          // a goal without a coded shot (deflection, carry into the net): still a shot on target
          this.add(side, 'SHOT', e.by, w.ball2()); this.add(side, 'SHOT_IN', e.by, w.ball2())
        }
        this.add(side, 'GOAL', e.by, w.ball2())
        this.shotOpen = null
        return
      }
      case 'control': {
        if (this.shotOpen) this.shotOpen = null
        return
      }
    }
  }
}
