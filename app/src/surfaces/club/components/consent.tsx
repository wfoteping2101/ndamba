// Public recruitment profiles and minors: a player who may be under 18 goes public only after the club confirms
// that a parent or guardian agreed (or that the player, now an adult, agreed). The date of that confirmation is
// kept on the profile; the public page stays hidden without it.
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import type { Player } from '../../../lib/types'
import { Modal } from '../../../ui'

/** Born this many years ago or fewer: the player may be under 18 at some point this year. */
export function mayBeMinor(p: Pick<Player, 'birthYear'>, year = new Date().getFullYear()) {
  return !!p.birthYear && year - p.birthYear <= 18
}

/** A profile can be shown in public only for an adult, or once the club has recorded consent. */
export function consentOk(p: Player) {
  return !mayBeMinor(p) || !!p.recruit?.consentAt
}

export async function setPublic(p: Player, on: boolean, consent = false) {
  await db.players.update(p.id, { recruit: { ...(p.recruit ?? {}), public: on, ...(consent ? { consentAt: new Date().toISOString() } : {}) } })
}

/** The public switch with the consent step: askPublic(p, v) either saves at once or opens the dialog first. */
export function usePublicSwitch() {
  const { t } = useT('club')
  const [pending, setPending] = useState<Player | null>(null)
  const [agreed, setAgreed] = useState(false)
  const askPublic = (p: Player, on: boolean) => {
    if (on && !consentOk(p)) { setAgreed(false); setPending(p); return }
    void setPublic(p, on)
  }
  const close = () => setPending(null)
  const consentDialog = (
    <Modal open={!!pending} onClose={close} title={t('consent.title')}
      footer={<>
        <button type="button" className="btn-ghost min-h-[44px]" onClick={close}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary min-h-[44px]" disabled={!agreed} onClick={async () => { if (pending) await setPublic(pending, true, true); close() }}>
          <ShieldCheck size={17} />{t('consent.confirm')}
        </button>
      </>}>
      {pending && (
        <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
          <p>{t('consent.body', { name: pending.name, year: pending.birthYear })}</p>
          <p className="text-[14px] text-ink-muted">{t('consent.shows')}</p>
          <label className="flex cursor-pointer items-start gap-3 rounded-control border border-line bg-paper px-3 py-3">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-forest-600" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span className="text-[14.5px] text-ink">{t('consent.check')}</span>
          </label>
        </div>
      )}
    </Modal>
  )
  return { askPublic, consentDialog }
}
