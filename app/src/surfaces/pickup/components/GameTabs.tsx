// Game page panels: payments (organiser tracking and « Payer par MoMo »), peer ratings, tier rules.
import { useT } from '../../../i18n'
import { PICKUP } from '../../../lib/config'
import type { PayMethod, PickupGame, PickupGroup, PickupPlayer, PickupRating } from '../../../lib/types'
import { cx } from '../../../lib/util'
import { fmtMoney, matchCode, MIN_RATINGS, paymentSummary, rate, setPaid, teammatesToRate, TIER_RULES, TIERS, type PickupRsvpX } from '../../../lib/pickup'
import { Progress } from '../../../ui'
import { Avatar, CopyButton, dec, PlanGate, TierBadge } from './kit'

const METHODS: PayMethod[] = ['momo', 'orange', 'cash', 'waived']

/* ---------------- Payments ---------------- */

export function PaymentsPanel({ game, group, going, labelOf, subOf, me, hostName, amAdmin }: {
  game: PickupGame; group: PickupGroup; going: PickupRsvpX[]; labelOf: (r: PickupRsvpX) => string; subOf: (r: PickupRsvpX) => string
  me?: PickupPlayer; hostName: string; amAdmin: boolean
}) {
  const { t, lang } = useT('pickup')
  const cur = group.currency
  if (!game.fee) return <p className="rounded-card border border-dashed border-line bg-paper/60 px-4 py-5 text-[14.5px] text-ink-muted">{t('pay.free')}</p>
  const s = paymentSummary(game, going)
  const mine = me ? going.find((r) => r.playerId === me.id && !r.guestOf) : undefined
  const myGuests = me ? going.filter((r) => r.guestOf === me.id) : []
  const myDue = (mine && !mine.paid ? 1 : 0) + myGuests.filter((r) => !r.paid).length
  const isHost = me && group.adminIds[0] === me.id
  const payers = s.due - s.waived
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 space-y-6">
        <section className="card card-pad">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-ink-muted">{t('pay.progress')}</div>
              <div className="num mt-1 font-display text-[26px] leading-none text-ink">{t('pay.paidOf', { n: s.paid, total: payers })}</div>
            </div>
            <div className="text-right text-[14px]">
              <div className="text-ink-soft">{t('pay.collected')} <span className="num font-semibold text-forest-700">{fmtMoney(s.collected, cur, lang)}</span></div>
              <div className="text-ink-soft">{t('pay.outstanding')} <span className={cx('num font-semibold', s.outstanding ? 'text-clay-700' : 'text-ink')}>{fmtMoney(s.outstanding, cur, lang)}</span></div>
            </div>
          </div>
          <Progress value={s.paid} max={Math.max(1, payers)} className="mt-4" />
          {s.waived > 0 && <p className="mt-2 text-[13px] text-ink-muted">{t('pay.waivedCount', { count: s.waived })}</p>}
        </section>

        {amAdmin ? (
          <PlanGate what={t('plan.what.payments')}>
            <ul className="card divide-y divide-line overflow-hidden">
              {going.map((r) => (
                <li key={r.id} className="px-3 py-3 sm:px-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={labelOf(r)} size={36} guest={!!r.guestOf} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold text-ink">{labelOf(r)}</div>
                      <div className="truncate text-[12.5px] text-ink-muted">{subOf(r)}</div>
                    </div>
                    <span className="num shrink-0 text-[14px] text-ink-soft">{fmtMoney(game.fee, cur, lang)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-12" role="group" aria-label={t('pay.markFor', { name: labelOf(r) })}>
                    {METHODS.map((m) => (
                      <button key={m} type="button" aria-pressed={r.paid === m} onClick={() => setPaid(r.id, r.paid === m ? undefined : m)}
                        className={cx('chip min-h-[40px] cursor-pointer px-3 text-[13px] transition-colors', r.paid === m ? (m === 'waived' ? 'border-ink-soft bg-ink-soft text-white' : 'chip-on') : 'hover:border-ink-faint')}>
                        {t(`pay.method.${m}`)}
                      </button>
                    ))}
                    {!r.paid && <span className="self-center pl-1 text-[12.5px] font-semibold text-clay-700">{t('pay.unpaid')}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </PlanGate>
        ) : (
          <p className="text-[14px] text-ink-muted">{t('pay.privacy')}</p>
        )}
      </div>

      <aside className="min-w-0 space-y-4">
        {mine && !isHost && (
          <section className="card card-pad">
            <h3 className="text-[17px] text-ink">{t('pay.mine')}</h3>
            <p className="mt-1 text-[14.5px] text-ink-soft">
              {myDue ? t('pay.youOwe', { amount: fmtMoney(myDue * game.fee, cur, lang), count: myDue }) : t('pay.youPaid', { method: t(`pay.method.${mine.paid ?? 'cash'}`) })}
            </p>
          </section>
        )}
        {(group.payHandles.momo || group.payHandles.orange || group.payHandles.cash) && (
          <section className="rounded-panel border border-line bg-paper p-4 sm:p-5">
            <h3 className="text-[17px] text-ink">{t('pay.howTitle')}</h3>
            {group.payHandles.momo && <PayHow label={t('pay.payMomo')} number={group.payHandles.momo} amount={fmtMoney((myDue || 1) * game.fee, cur, lang)} code={matchCode(game, group)} hostName={hostName} />}
            {group.payHandles.orange && <PayHow label={t('pay.payOrange')} number={group.payHandles.orange} amount={fmtMoney((myDue || 1) * game.fee, cur, lang)} code={matchCode(game, group)} hostName={hostName} />}
            {group.payHandles.cash && <p className="mt-3 text-[14px] text-ink-soft">{t('pay.cash')}</p>}
            <p className="mt-3 text-[12.5px] leading-snug text-ink-muted">{t('pay.honest')}</p>
          </section>
        )}
      </aside>
    </div>
  )
}

function PayHow({ label, number, amount, code, hostName }: { label: string; number: string; amount: string; code: string; hostName: string }) {
  const { t } = useT('pickup')
  return (
    <details className="group mt-3 rounded-card border border-line bg-cream open:bg-paper">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 px-4 text-[15px] font-semibold text-forest-700">
        {label}<span aria-hidden="true" className="text-ink-faint transition-transform group-open:rotate-45">+</span>
      </summary>
      <ol className="space-y-3 px-4 pb-4 text-[14px] text-ink-soft">
        <li>
          <div>{t('pay.step1', { amount, name: hostName })}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2"><span className="num rounded-control bg-sand px-3 py-2 font-semibold text-ink">{number}</span><CopyButton text={number.replace(/\s/g, '')} label={t('pay.copyNumber')} /></div>
        </li>
        <li>
          <div>{t('pay.step2')}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2"><span className="num rounded-control bg-sand px-3 py-2 font-semibold tracking-wide text-ink">{code}</span><CopyButton text={code} label={t('pay.copyCode')} /></div>
        </li>
        <li>{t('pay.step3')}</li>
      </ol>
    </details>
  )
}

/* ---------------- Ratings ---------------- */

export function RatingsPanel({ game, rsvps, ratings, me, labelOf }: { game: PickupGame; rsvps: PickupRsvpX[]; ratings: PickupRating[]; me?: PickupPlayer; labelOf: (id: string) => string }) {
  const { t } = useT('pickup')
  const mates = me ? teammatesToRate(game, rsvps, me.id) : []
  const mineGiven = new Map(ratings.filter((r) => r.gameId === game.id && r.from === me?.id).map((r) => [r.to, r.score]))
  const done = mates.filter((m) => mineGiven.has(m)).length
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
      <section className="min-w-0">
        {game.status !== 'played' ? (
          <p className="rounded-card border border-dashed border-line bg-paper/60 px-4 py-5 text-[14.5px] text-ink-muted">{t('rate.notYet')}</p>
        ) : !mates.length ? (
          <p className="rounded-card border border-dashed border-line bg-paper/60 px-4 py-5 text-[14.5px] text-ink-muted">{t('rate.cannot')}</p>
        ) : (
          <div className="card card-pad">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[17px] text-ink">{t('rate.title')}</h3>
              <span className="num text-[13px] font-semibold text-ink-muted">{t('rate.progress', { n: done, total: mates.length })}</span>
            </div>
            <p className="mb-4 text-[14px] text-ink-muted">{t('rate.body')}</p>
            <ul className="space-y-4">
              {mates.map((id) => (
                <li key={id}>
                  <div className="mb-2 flex items-center gap-2.5"><Avatar name={labelOf(id)} size={32} /><span className="text-[15px] font-semibold text-ink">{labelOf(id)}</span></div>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('rate.for', { name: labelOf(id) })}>
                    {([1, 2, 3, 4, 5] as const).map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={mineGiven.get(id) === n} onClick={() => me && rate(game.id, me.id, id, n)}
                        className={cx('grid h-11 w-11 place-items-center rounded-full border text-[16px] font-semibold transition-colors',
                          mineGiven.get(id) === n ? 'border-forest-600 bg-forest-600 text-white' : 'border-line bg-paper text-ink hover:border-ink-faint')}
                        title={t(`rate.scale.${n}`)}>
                        {n}
                      </button>
                    ))}
                    <span className="self-center pl-1 text-[13px] text-ink-muted">{mineGiven.has(id) ? t(`rate.scale.${mineGiven.get(id)}`) : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <aside className="min-w-0"><TierRules /></aside>
    </div>
  )
}

export function TierRules() {
  const { t, lang } = useT('pickup')
  return (
    <section className="rounded-panel border border-line bg-paper p-4 sm:p-5">
      <h3 className="text-[17px] text-ink">{t('rules.title')}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{t('rules.anonymous', { min: MIN_RATINGS })}</p>
      <ul className="mt-3 space-y-2.5">
        {TIERS.map((tier) => (
          <li key={tier} className="flex items-start gap-3">
            <span className="mt-0.5 w-[78px] shrink-0"><TierBadge tier={tier} /></span>
            <span className="text-[14px] leading-snug text-ink-soft">{tier === 'bronze' ? t('rules.bronze', { games: TIER_RULES.bronze.games }) : t('rules.withAvg', { games: TIER_RULES[tier].games, avg: dec(TIER_RULES[tier].avg, lang) })}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">{t('rules.played')}</p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{t('rules.reliability', { late: PICKUP.lateAfter })}</p>
    </section>
  )
}
