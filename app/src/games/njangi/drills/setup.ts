// Gives every player of a drill scenario a brain, according to the lesson's opposition and phase.
// Our side (team a, its keeper and the neutrals that play for whoever has the ball) keeps the ball
// with SupportBrain and, for the ball carrier, a CarrierBrain that waits for the player's decision
// when the user is in charge. The other side defends with DefenderBrain at the chosen level.
import { CarrierBrain, DefenderBrain, HoldBrain, KeeperBrain, PhaseBrain, ShadowBrain, SupportBrain } from '../../engine/ai/brains'
import { DIFFICULTY, type Level, type Player } from '../../engine/sim/types'
import type { Brain, World } from '../../engine/sim/world'
import type { DrillGameplay } from './types'

/** The carrier waits for the user's pass; it shields and carries a little, it never passes by itself. */
export class UserCarrierBrain implements Brain {
  /** carry: in games to goals, the carrier runs into free space by himself */
  constructor(private fallback: Brain, private carry = false) {}
  think(w: World, me: Player) {
    if (w.ball.owner !== me.id) { this.fallback.think(w, me); return }
    if (me.pending) return
    me.meta.heldFor = ((me.meta.heldFor as number) ?? 0) + 0.1
    let near: Player | null = null, nd = 99
    for (const o of w.opponents(me)) { const d = Math.hypot(o.pos.x - me.pos.x, o.pos.y - me.pos.y); if (d < nd) { nd = d; near = o } }
    // free in front: carry the ball towards the goal (the user still decides every pass and shot)
    const side = w.sideOf(me) ?? 'a'
    const goal = w.pitch.goalFor[side]
    if (this.carry && goal && (!near || nd > 5.5) && Math.hypot(goal.x - me.pos.x, goal.y - me.pos.y) > (goal.mini ? 6 : 14)) {
      const d = { x: goal.x - me.pos.x, y: goal.y - me.pos.y }
      const l = Math.hypot(d.x, d.y) || 1
      me.target = { x: me.pos.x + (d.x / l) * 4, y: me.pos.y + (d.y / l) * 4 }
      me.speedMode = 0.55
      me.faceTarget = null
      return
    }
    // the ball ran a little ahead: go and put a foot on it
    const fb = w.foot(me)
    if (Math.hypot(w.ball.pos.x - fb.x, w.ball.pos.y - fb.y) > 0.8) { me.target = w.ball2(); me.speedMode = 0.6; me.faceTarget = null; return }
    // shield: keep the body between the ball and the nearest opponent, small steps only
    if (near && nd < 4) {
      const away = { x: me.pos.x - near.pos.x, y: me.pos.y - near.pos.y }
      const l = Math.hypot(away.x, away.y) || 1
      me.target = { x: me.pos.x + (away.x / l) * 0.8, y: me.pos.y + (away.y / l) * 0.8 }
      me.target.x = Math.max(0.8, Math.min(w.pitch.w - 0.8, me.target.x))
      me.target.y = Math.max(0.8, Math.min(w.pitch.h - 0.8, me.target.y))
      me.speedMode = 0.4
    } else { me.target = null; me.speedMode = 0.3 }
    me.faceTarget = null
  }
}

export interface SetupOpts {
  gameplay?: DrillGameplay | null
  level: Level
  /** the user decides our passes (otherwise the AI plays both sides: demonstrations) */
  user: boolean
  /** demonstration: the director moves the players of the sequence; nobody defends actively */
  demo?: boolean
}

const ours = (p: Player) => p.team === 'a' || p.team === 'n'

export function assignBrains(w: World, o: SetupOpts) {
  w.diff = DIFFICULTY[o.level]
  const g = o.gameplay
  const opposition = o.demo ? 'passive' : g?.opposition ?? 'active'
  const maxTouches = g?.touches
  for (const p of w.players) {
    let brain: Brain
    if (p.gk) brain = new KeeperBrain({ waitForCall: (o.demo || o.user) && ours(p) })
    else if (ours(p)) {
      const support: Brain = g?.mode === 'pattern' || o.demo ? new HoldBrain() : new SupportBrain({ roam: Math.min(6, Math.max(2.5, Math.min(w.pitch.w, w.pitch.h) / 6)) })
      // in a demonstration the director makes every pass; with the user, the user does
      // the carrier runs with the ball by himself only where the rules let him take touches
      const toGoals = !!g && ['ssg', 'phase', 'transition', 'finishing'].includes(g.mode) && !(g.touches && g.touches <= 3)
      const carrier: Brain = o.user || o.demo
        ? new UserCarrierBrain(support, o.user && toGoals)
        : new CarrierBrain(support, { maxTouches, intention: 'progresser' })
      brain = new PhaseBrain(carrier, support, p.team === 'n' ? support : new DefenderBrain({ passive: false }))
    } else {
      // team b: the opposition of the drill
      if (opposition === 'none') brain = new HoldBrain()
      else if (o.demo) brain = new ShadowBrain()
      else {
        const def = new DefenderBrain({ passive: opposition === 'passive' })
        brain = new PhaseBrain(new CarrierBrain(new SupportBrain(), { intention: 'progresser' }), new SupportBrain(), def)
      }
    }
    w.brains.set(p.id, brain)
  }
}
