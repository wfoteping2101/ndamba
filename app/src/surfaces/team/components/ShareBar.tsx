// Send a call-up: WhatsApp, SMS, e-mail, copy, calendar file.
import { CalendarPlus, Mail, MessageCircle, Smartphone } from 'lucide-react'
import type { Match, Team } from '../../../lib/types'
import { mailLink, smsLink, toICS, whatsappLink } from '../../../lib/actions'
import { BRAND } from '../../../lib/config'
import { useT } from '../../../i18n'
import { cx, download } from '../../../lib/util'
import { CopyButton } from './bits'

export function matchICS(match: Pick<Match, 'id' | 'opponent' | 'date' | 'time' | 'venue' | 'halfMinutes'>, team: Team | null | undefined, title: string, description?: string) {
  return toICS([{ uid: match.id, title, date: match.date, time: match.time, minutes: match.halfMinutes * 2 + 15, location: match.venue, description }])
}

export function ShareBar({ text, match, team, className, compact = false }: { text: string; match: Pick<Match, 'id' | 'opponent' | 'date' | 'time' | 'venue' | 'halfMinutes'>; team: Team | null | undefined; className?: string; compact?: boolean }) {
  const { t } = useT('team')
  const subject = t('share.subject', { team: team?.name ?? '', opponent: match.opponent })
  const ics = () => {
    const slug = match.opponent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'match'
    download(`${BRAND.name.toLowerCase()}-${match.date}-${slug}.ics`, matchICS(match, team, t('share.icsTitle', { team: team?.name ?? '', opponent: match.opponent }), text), 'text/calendar')
  }
  const btn = cx('btn-outline', compact && 'btn-sm')
  return (
    <div className={cx('flex flex-wrap gap-2', className)}>
      <a className={cx('btn', compact && 'btn-sm', 'bg-[#1F7A4D] text-white hover:bg-[#186640]')} href={whatsappLink(text)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} />{t('share.whatsapp')}</a>
      <a className={btn} href={smsLink(text)}><Smartphone size={17} />{t('share.sms')}</a>
      <a className={btn} href={mailLink(subject, text)}><Mail size={17} />{t('share.email')}</a>
      <CopyButton text={text} className={compact ? 'btn-sm' : undefined} />
      <button type="button" className={btn} onClick={ics}><CalendarPlus size={17} />{t('share.ics')}</button>
    </div>
  )
}
