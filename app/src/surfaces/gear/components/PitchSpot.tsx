// The ideal camera spot, from above: raised, level with the halfway line, a few metres behind the touchline,
// the whole pitch in frame (the gold cone).
export function PitchSpot({ camera, height, frame, className }: { camera: string; height: string; frame: string; className?: string }) {
  const W = 360, H = 268, x0 = 20, y0 = 18, pw = 320, ph = 196
  const cx = x0 + pw / 2, cam = { x: cx, y: y0 + ph + 34 }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`${camera}. ${height}. ${frame}.`}>
      <rect x="0" y="0" width={W} height={H} rx="18" fill="#063A25" />
      <rect x={x0} y={y0} width={pw} height={ph} fill="#0B5D3B" />
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x={x0 + i * (pw / 8)} y={y0} width={pw / 16} height={ph} fill="#0E6842" />)}
      <g fill="none" stroke="#F6F7F2" strokeOpacity=".85" strokeWidth="1.6">
        <rect x={x0} y={y0} width={pw} height={ph} />
        <line x1={cx} y1={y0} x2={cx} y2={y0 + ph} />
        <circle cx={cx} cy={y0 + ph / 2} r="26" />
        <rect x={x0} y={y0 + ph / 2 - 52} width="50" height="104" />
        <rect x={x0 + pw - 50} y={y0 + ph / 2 - 52} width="50" height="104" />
        <rect x={x0} y={y0 + ph / 2 - 22} width="17" height="44" />
        <rect x={x0 + pw - 17} y={y0 + ph / 2 - 22} width="17" height="44" />
      </g>
      <polygon points={`${cam.x},${cam.y} ${x0 - 4},${y0 - 2} ${x0 + pw + 4},${y0 - 2}`} fill="#F5B700" fillOpacity=".16" />
      <g stroke="#F5B700" strokeWidth="1.4" strokeDasharray="4 4" strokeOpacity=".9">
        <line x1={cam.x} y1={cam.y} x2={x0 - 4} y2={y0 - 2} />
        <line x1={cam.x} y1={cam.y} x2={x0 + pw + 4} y2={y0 - 2} />
      </g>
      <g transform={`translate(${cam.x - 11} ${cam.y - 8})`}>
        <rect width="22" height="16" rx="3.5" fill="#F5B700" />
        <circle cx="11" cy="8" r="4.2" fill="#063A25" />
      </g>
      <g fontFamily="'Archivo Variable', Archivo, sans-serif" fontSize="11.5" fontWeight="650" fill="#F6F7F2">
        <text x={cam.x + 20} y={cam.y + 4}>{camera}</text>
        <text x={cam.x - 20} y={cam.y + 4} textAnchor="end" fill="#FFD452">{height}</text>
        <rect x={cx - 74} y={y0 + 30} width="148" height="22" rx="11" fill="#063A25" fillOpacity=".88" />
        <text x={cx} y={y0 + 45} textAnchor="middle">{frame}</text>
      </g>
    </svg>
  )
}
