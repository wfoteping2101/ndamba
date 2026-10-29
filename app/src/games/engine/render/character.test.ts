import { describe, expect, it } from 'vitest'
import { Character } from './character'
import { HAIRS, KITS, SKINS, lookFor } from '../looks'

describe('characters', () => {
  it('builds every hair style, kit and build without errors', () => {
    for (const hair of [...new Set(HAIRS), 'long', 'cap', 'puff', 'bald'] as const) for (const kit of Object.keys(KITS) as (keyof typeof KITS)[]) {
      const look = { ...lookFor('x', kit), hair, skin: SKINS[0] }
      for (const kid of [false, true]) {
        const c = new Character({ ...look, kid, prop: kid ? 'notebook' as const : undefined }, {})
        expect(c.mesh.geometry.attributes.position.count).toBeGreaterThan(100)
        c.dispose()
      }
    }
  })
})
