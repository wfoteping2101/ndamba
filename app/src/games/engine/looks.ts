// Kits and faces. Team colours follow the books' diagrams (tools/pitch.mjs): team a green,
// team b red, neutrals yellow, our keeper slate blue, their keeper plum. Skin tones and hair vary
// deterministically from the player id so a drill always shows the same squad.
import type { Look } from './sim/types'

export const SKINS = ['#5B3A27', '#4a2f20', '#6b4430', '#3d271b', '#7a5038', '#56372a', '#8a5a3c', '#2f1e15', '#6f4a35', '#a06b48']
export const HAIRS: Look['hair'][] = ['crop', 'twists', 'crop', 'afro', 'cornrows', 'bald', 'crop', 'puff', 'twists', 'crop']
const HAIR_COLORS = ['#15100c', '#1d140e', '#120d0a', '#2a1c12', '#3a2717']

export const KITS = {
  a: { shirt: '#0B5D3B', trim: '#F5B700', shorts: '#F6F7F2', socks: '#0B5D3B' },
  b: { shirt: '#D7263D', trim: '#F6F7F2', shorts: '#12211A', socks: '#D7263D' },
  n: { shirt: '#F5B700', trim: '#12211A', shorts: '#12211A', socks: '#F5B700' },
  gk: { shirt: '#3D4F6B', trim: '#F5B700', shorts: '#2b3646', socks: '#3D4F6B' },
  gkb: { shirt: '#6B4A7A', trim: '#F6F7F2', shorts: '#3d2a46', socks: '#6B4A7A' },
} as const

export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function lookFor(id: string, kit: keyof typeof KITS, opts: { kid?: boolean; number?: number; seed?: string } = {}): Look {
  const h = hash((opts.seed ?? '') + id)
  const k = KITS[kit]
  return {
    skin: SKINS[h % SKINS.length],
    hair: HAIRS[(h >>> 4) % HAIRS.length],
    hairColor: HAIR_COLORS[(h >>> 8) % HAIR_COLORS.length],
    shirt: k.shirt, shirtTrim: k.trim, shorts: k.shorts, sockL: k.socks, sockR: k.socks,
    boots: ['#12211A', '#f2f2ee', '#1c2b4a', '#2a2a2a'][(h >>> 12) % 4],
    number: opts.number, kid: opts.kid, build: 0.94 + ((h >>> 16) % 13) / 100,
    gloves: kit === 'gk' || kit === 'gkb' ? '#F5B700' : undefined,
  }
}
