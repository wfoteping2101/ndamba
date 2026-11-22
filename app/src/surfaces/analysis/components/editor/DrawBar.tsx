// The drawing toolbar: tools, colours, undo and redo, and « Enregistrer l'image » (frame plus drawing,
// as seen on screen, zoom included), attached to the selected clip or coded action.
import { Check, Circle, Eraser, Flashlight, ImageDown, MoveUpRight, Pentagon, Redo2, Spline, Square, Type, Undo2, Waypoints, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import { DRAW_COLORS, MULTI, type DrawColor, type Tool } from './draw'
import type { DrawState } from './Stage'

const TOOLS: [Tool, LucideIcon][] = [
  ['arrow', MoveUpRight], ['circle', Circle], ['free', Spline], ['spotlight', Flashlight],
  ['rect', Square], ['poly', Pentagon], ['connect', Waypoints], ['text', Type],
]

export function DrawBar({ draw, onSave, onClose, target }: { draw: DrawState; onSave: () => void; onClose: () => void; target: string }) {
  const { t } = useT('editor')
  return (
    <div className="mt-2 rounded-2xl bg-night-800 p-2 text-cream ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-1">
        {TOOLS.map(([k, Icon]) => (
          <button key={k} type="button" onClick={() => draw.setTool(k)} aria-pressed={draw.tool === k} title={t(`draw.help.${k}`)}
            className={cx('flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-semibold', draw.tool === k ? 'bg-cream text-ink' : 'bg-white/5 text-cream/80 hover:text-cream')}>
            <Icon size={16} /><span className="hidden sm:inline">{t(`draw.tools.${k}`)}</span><span className="sr-only sm:hidden">{t(`draw.tools.${k}`)}</span>
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {(Object.keys(DRAW_COLORS) as DrawColor[]).map((c) => (
          <button key={c} type="button" onClick={() => draw.setColor(c)} aria-pressed={draw.color === c} aria-label={t(`draw.colors.${c}`)} title={t(`draw.colors.${c}`)}
            className={cx('grid h-10 w-9 place-items-center rounded-full', draw.color === c && 'ring-2 ring-cream ring-offset-2 ring-offset-night-800')}>
            <span className="h-6 w-6 rounded-full" style={{ background: DRAW_COLORS[c] }} />
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-white/15" />
        <Ctl label={t('draw.undo')} onClick={draw.undo} disabled={!draw.canUndo}><Undo2 size={17} /></Ctl>
        <Ctl label={t('draw.redo')} onClick={draw.redo} disabled={!draw.canRedo}><Redo2 size={17} /></Ctl>
        <Ctl label={t('draw.clear')} onClick={draw.clear} disabled={!draw.canUndo}><Eraser size={17} /></Ctl>
        {draw.open && MULTI.includes(draw.open.kind) && (
          <button type="button" onClick={draw.finish} className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-[12.5px] font-semibold text-cream"><Check size={15} />{t('draw.finish')}</button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={onSave} disabled={!draw.shapes.length && !draw.open} className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-sun-500 px-3 text-[13px] font-semibold text-ink disabled:opacity-50"><ImageDown size={16} />{t('draw.save')}</button>
          <Ctl label={t('draw.close')} onClick={onClose}><X size={17} /></Ctl>
        </div>
      </div>
      <p className="mt-1 px-1 text-[11.5px] leading-snug text-cream/55">{t(`draw.help.${draw.tool}`)} {target}</p>
    </div>
  )
}

function Ctl({ label, onClick, children, disabled = false }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled}
      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-cream/85 transition hover:bg-white/10 disabled:opacity-35">{children}</button>
  )
}
