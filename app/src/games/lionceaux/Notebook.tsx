// BriBri's notebook page: the chapter's Leçon du Ballon, word for word, with its little drawing.
import { BookOpen, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import type { Lesson } from '../../lib/types'
import { tome1Chapter } from '../njangi/links'

/** the wax-print edge of the notebook (green and orange, « cousu tout autour à petits points ») */
const PAGNE = 'repeating-linear-gradient(135deg, #2E6B45 0 10px, #D9822B 10px 16px, #2E6B45 16px 22px, #F2EEE3 22px 25px)'

export function Notebook({ lesson, onContinue, playHref }: { lesson: Lesson; onContinue?: () => void; playHref?: string }) {
  const { t } = useT('lionceaux')
  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-black/45 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="lesson-title">
      <div className="relative w-full max-w-lg rounded-[18px] p-[9px] shadow-2xl" style={{ background: PAGNE }}>
        <div className="rounded-[12px] bg-[#F6F7F2] px-5 pb-5 pt-4 text-[#12211A] sm:px-7 sm:pb-6"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 27px, rgba(11,93,59,0.16) 27px 28px)', backgroundPositionY: '10px' }}>
          <p className="text-[12.5px] font-semibold text-[#0B5D3B]">{t('lesson.notebook')} · {t('lesson.fromBook')}</p>
          <h2 id="lesson-title" className="mt-1 text-[21px] font-semibold leading-tight sm:text-[23px]">{t('lesson.title', { n: lesson.no })}</h2>
          <p className="text-[17px] font-semibold leading-snug text-[#0B5D3B]">{lesson.title}</p>
          <ul className="mt-3 space-y-[7px] text-[15.5px] leading-[1.45]">
            {lesson.lines.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
          {!lesson.diagram && <p className="mt-3 text-[13.5px] text-[#12211A]/70">{t('lesson.noDiagram')}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {playHref && lesson.diagram && <Link to={playHref} className="btn-sun"><Play size={17} strokeWidth={1.75} aria-hidden="true" />{t('lesson.play')}</Link>}
            {onContinue && <button type="button" onClick={onContinue} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#0B5D3B] px-5 text-[15px] font-semibold text-[#F6F7F2] hover:bg-[#0a4f33]">{t('lesson.continue')}</button>}
            <a href={tome1Chapter(lesson.no)} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-[14.5px] font-semibold text-[#0B5D3B] underline underline-offset-4"><BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />{t('chapters.read')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
