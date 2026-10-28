// Ten-axis radar of the Njangi competences (scale 1 to 4). Pure SVG, light.
import type { Player, SkillKey } from '../../../lib/types'
import { useT } from '../../../i18n'
import { SKILL_KEYS } from './lineup'

export function SkillRadar({ skills, compare, size = 320, className }: { skills: Player['skills']; compare?: Partial<Record<SkillKey, number>>; size?: number; className?: string }) {
  const { t } = useT('team')
  const cx = 160, cy = 150, R = 96
  const n = SKILL_KEYS.length
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const pt = (i: number, v: number) => [cx + Math.cos(ang(i)) * (R * v) / 4, cy + Math.sin(ang(i)) * (R * v) / 4]
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ')
  const mine = SKILL_KEYS.map((k) => Number(skills[k] || 0))
  const theirs = compare ? SKILL_KEYS.map((k) => Number(compare[k] || 0)) : null
  return (
    <svg viewBox="-44 18 408 268" width="100%" style={{ maxWidth: size + 100 }} className={className} role="img"
      aria-label={SKILL_KEYS.map((k, i) => `${t(`common:skills.${k}`)} ${mine[i] || '-'}`).join(', ')}>
      {[1, 2, 3, 4].map((lvl) => (
        <polygon key={lvl} points={poly(Array(n).fill(lvl))} fill={lvl === 4 ? '#FFFFFF' : 'none'} stroke={lvl === 4 ? '#CFD6CC' : '#DCE2D8'} strokeWidth={lvl === 4 ? 1.2 : 0.8} />
      ))}
      {SKILL_KEYS.map((_, i) => { const [x, y] = pt(i, 4); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#DCE2D8" strokeWidth={0.8} /> })}
      {[1, 2, 3, 4].map((lvl) => <text key={lvl} x={cx + 3} y={cy - (R * lvl) / 4 + 3} fontSize="8" fill="#94A198" fontFamily="Inter, sans-serif">{lvl}</text>)}
      {theirs && <polygon points={poly(theirs)} fill="none" stroke="#BF5A2E" strokeWidth={1.4} strokeDasharray="4 3" />}
      <polygon points={poly(mine)} fill="rgba(31,77,58,0.20)" stroke="#0B5D3B" strokeWidth={2} strokeLinejoin="round" />
      {mine.map((v, i) => { if (!v) return null; const [x, y] = pt(i, v); return <circle key={i} cx={x} cy={y} r={3.4} fill="#0B5D3B" stroke="#FFFFFF" strokeWidth={1.4} /> })}
      {SKILL_KEYS.map((k, i) => {
        const a = ang(i)
        const [x, y] = [cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16)]
        const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'
        return (
          <text key={k} x={x} y={y + (Math.sin(a) > 0.5 ? 8 : Math.sin(a) < -0.5 ? -2 : 3)} textAnchor={anchor} fontSize="12.5" fontWeight={600} fill="#34443B" fontFamily="Inter, sans-serif">
            {t(`skillsShort.${k}`)}
            <tspan fill={mine[i] ? '#0B5D3B' : '#94A198'} fontWeight={700}> {mine[i] || '·'}</tspan>
          </text>
        )
      })}
    </svg>
  )
}
