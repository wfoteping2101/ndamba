// A live rondo behind the menus: AI on both sides, the slow cinematic camera. Low quality, paused
// when the tab is hidden, off when the reader asked for reduced motion (a still frame stays).
import { useEffect } from 'react'
import { CarrierBrain, DefenderBrain, PhaseBrain, SupportBrain } from '../engine/ai/brains'
import { GameLoop, SimView } from '../engine/runtime'
import { DIFFICULTY } from '../engine/sim/types'
import { hasWebGL, useMounted } from '../shared/ui'
import { buildScenario } from './drills/scenario'
import type { DiagramSpec } from '../../lib/types'

const SPEC: DiagramSpec = {
  view: 'grid', w: 22, h: 16,
  players: [
    { id: 'a1', team: 'a', x: 3, y: 8 }, { id: 'a2', team: 'a', x: 11, y: 2 }, { id: 'a3', team: 'a', x: 19, y: 8 }, { id: 'a4', team: 'a', x: 11, y: 14 },
    { id: 'n1', team: 'n', x: 11, y: 8 },
    { id: 'b1', team: 'b', x: 8, y: 7 }, { id: 'b2', team: 'b', x: 14, y: 9 },
  ],
  ball: 'a1',
}

class Backdrop {
  view: SimView
  loop: GameLoop
  private vis = () => { if (document.hidden) this.loop.stop(); else this.loop.start() }
  constructor(el: HTMLElement, still: boolean) {
    const sc = buildScenario(SPEC, { seed: 3 })
    const w = sc.world
    w.diff = DIFFICULTY.facile
    for (const p of w.players) {
      if (p.team === 'b') w.brains.set(p.id, new DefenderBrain({ passive: false }))
      else w.brains.set(p.id, new PhaseBrain(new CarrierBrain(new SupportBrain({ roam: 3 }), { maxTouches: 2, patience: 0.9, canShoot: false }), new SupportBrain({ roam: 3 }), new SupportBrain({ roam: 3 })))
    }
    this.view = new SimView(el, w, { quality: 'low', surround: 'training', background: '#061710' })
    this.view.setCamera('cinematic', true)
    this.loop = new GameLoop(w, this.view)
    let restartAt = 0
    this.loop.onTick = () => {
      // keep the ball in play forever: a fresh start when it dies
      if ((w.dead || (!w.ball.owner && Math.hypot(w.ball.vel.x, w.ball.vel.y) < 0.05)) && !restartAt) restartAt = w.t + 1.2
      if (restartAt && w.t > restartAt) { restartAt = 0; w.giveBall(w.get('a1')!) }
    }
    if (still) { this.loop.simulate(2); this.view.render(1, 0.016) } else this.loop.start()
    document.addEventListener('visibilitychange', this.vis)
  }
  dispose() { document.removeEventListener('visibilitychange', this.vis); this.loop.stop(); this.view.dispose() }
}

export default function BackdropScene() {
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const { ref } = useMounted((el) => (hasWebGL() ? new Backdrop(el, !!still) : null), [])
  useEffect(() => {}, [])
  return <div ref={ref} aria-hidden="true" className="absolute inset-0 opacity-70" />
}
