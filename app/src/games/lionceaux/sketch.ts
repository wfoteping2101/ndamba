// The page of BriBri's notebook (chapter 5) and what makes a stroke the useful arrow.
export const W = 100, H = 130
export const LINE: [number, number][] = [[25, 52], [50, 52], [75, 52]]
export const R = 7
export const ME: [number, number] = [50, 102]
export const POLITE = 'M56,99 C64,86 72,72 84,70 S96,67 101,66'
export const USEFUL = 'M48,96 L30,15'

export type P = [number, number]

/** A stroke is the useful arrow when it starts at him, never touches a circle, crosses the line between two of them and ends beyond it. */
export function isUseful(pts: P[]) {
  if (pts.length < 4) return false
  const [sx, sy] = pts[0]
  if (Math.hypot(sx - ME[0], sy - ME[1]) > 14) return false
  for (const [x, y] of pts) for (const [cx, cy] of LINE) if (Math.hypot(x - cx, y - cy) < R + 0.8) return false
  const end = pts[pts.length - 1]
  if (end[1] > LINE[0][1] - 14) return false
  // where it crosses the line of circles: between the first and the last, not round the outside
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
    if ((y0 - LINE[0][1]) * (y1 - LINE[0][1]) <= 0 && y0 !== y1) {
      const x = x0 + ((LINE[0][1] - y0) / (y1 - y0)) * (x1 - x0)
      return x > LINE[0][0] && x < LINE[2][0]
    }
  }
  return false
}

