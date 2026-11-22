// The mark of the AI reading of a match: a pitch seen from above, read by a scanning line.
// Original glyph (never a sparkle or stars): it says what the AI does here, read the frames of the pitch.
export function AiMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M12 5v14" opacity=".55" />
      <circle cx="12" cy="12" r="2.4" opacity=".55" />
      <path d="M2.5 9.5h2.8v5H2.5M21.5 9.5h-2.8v5h2.8" opacity=".55" />
      <path d="M8 2.5v19" strokeWidth={2.1} />
      <path d="M8 2.5l-1.6 1.6M8 2.5l1.6 1.6" strokeWidth={1.5} />
    </svg>
  )
}
