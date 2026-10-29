// The useful arrow of chapter 5: from BriBri's circle, between two circles, to the other side.
import { describe, expect, it } from 'vitest'
import { isUseful } from './sketch'

const line = (a: [number, number], b: [number, number], n = 20) => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as [number, number])

describe('the useful arrow', () => {
  it('goes through a gap between two circles', () => { expect(isUseful(line([48, 96], [30, 15]))).toBe(true) })
  it('through the other gap too', () => { expect(isUseful(line([52, 96], [66, 18]))).toBe(true) })
  it('not through a circle', () => { expect(isUseful(line([50, 96], [50, 15]))).toBe(false) })
  it('not round the outside of the line', () => { expect(isUseful(line([50, 96], [6, 20]))).toBe(false) })
  it('not from somewhere else on the page', () => { expect(isUseful(line([20, 120], [38, 15]))).toBe(false) })
  it('it has to reach the other side', () => { expect(isUseful(line([48, 96], [40, 50]))).toBe(false) })
})
