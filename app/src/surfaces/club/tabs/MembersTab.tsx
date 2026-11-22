// Membres: who is in the club, with which role and teams, and what each role can reach (MEMBER_RIGHTS).
// « Inviter » creates an invitation with a link to copy and a WhatsApp or e-mail message the user sends himself.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Link2, Mail, MessageCircle, Minus, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useT } from '../../../i18n'
import { MEMBER_RIGHTS } from '../../../lib/config'
import { useSession } from '../../../lib/session'
import { db } from '../../../lib/db'
import type { Member, MemberRole, Team } from '../../../lib/types'
import { cx, fmtDate, nowISO, todayISO } from '../../../lib/util'
import { Badge, Field, Modal } from '../../../ui'
import { Avatar, ConfirmModal, CopyButton } from '../components/bits'
import { inviteUrl, newMemberId, type ClubData } from '../components/data'

const ROLES: MemberRole[] = ['admin', 'coach', 'analyst', 'player', 'parent']
const ROLE_TONE: Record<MemberRole, 'dark' | 'forest' | 'terra' | 'neutral'> = { admin: 'dark', coach: 'forest', analyst: 'terra', player: 'neutral', parent: 'neutral' }

export function MembersTab({ data }: { data: ClubData }) {
  const { t, lang } = useT('club')
  const me = useSession().profile?.name
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [sharing, setSharing] = useState<Member | null>(null)
  const [removing, setRemoving] = useState<Member | null>(null)
  const teamsById = useMemo(() => new Map(data.teams.map((tm) => [tm.id, tm])), [data.teams])
  const members = useMemo(() => [...data.members].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'active' ? -1 : 1)), [data.members])
  const teamNames = (m: Member) => {
    if (m.role === 'admin' || (data.teams.length > 1 && data.teams.every((tm) => m.teamIds.includes(tm.id)))) return t('members.allTeams')
    const names = m.teamIds.map((id) => teamsById.get(id)?.name).filter(Boolean)
    return names.length ? names.join(', ') : t('members.noTeam')
  }
  const playerName = (m: Member) => (m.playerId ? data.players.find((p) => p.id === m.playerId)?.name : undefined)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-ink-muted">{t('members.lead', { count: data.members.length })}</p>
        <button type="button" className="btn-primary min-h-[44px]" onClick={() => setInviting(true)}><UserPlus size={17} />{t('members.invite')}</button>
      </div>

      {members.length === 0 ? (
        <p className="rounded-card border border-line bg-paper px-4 py-6 text-center text-[14.5px] text-ink-muted">{t('members.empty')}</p>
      ) : (
        <ul data-tour="club-members" className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
          {members.map((m) => {
            const pn = playerName(m)
            return (
              <li key={m.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={m.name} tone={m.status === 'active' ? 'forest' : 'sand'} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-ink">{m.name}</span>
                      {me && m.name === me && <span className="text-[12.5px] font-semibold text-ink-muted">{t('members.you')}</span>}
                      <Badge tone={ROLE_TONE[m.role]}>{t(`roles.${m.role}`)}</Badge>
                      {m.status === 'invited' && <Badge tone="sun">{t('members.invited')}</Badge>}
                    </div>
                    <div className="mt-0.5 text-[13px] leading-snug text-ink-muted">
                      {teamNames(m)}
                      {pn && <>{', '}{t(m.role === 'parent' ? 'members.parentOf' : 'members.playerIs', { name: pn })}</>}
                      {m.status === 'invited' && m.invitedAt && <>{'. '}{t('members.invitedOn', { date: fmtDate(m.invitedAt, lang, { day: 'numeric', month: 'long' }) })}</>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1 pl-[52px] sm:pl-0">
                  {m.status === 'invited' && <button type="button" className="btn-outline btn-sm min-h-[40px]" onClick={() => setSharing(m)}><Link2 size={15} />{t('members.link')}</button>}
                  <button type="button" className="btn-ghost btn-sm min-h-[40px]" onClick={() => setEditing(m)}><Pencil size={15} />{t('members.edit')}</button>
                  <button type="button" className="grid h-10 w-10 place-items-center rounded-[10px] text-ink-faint hover:bg-clay-50 hover:text-clay-600" onClick={() => setRemoving(m)} aria-label={t('members.remove', { name: m.name })}><Trash2 size={16} /></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <section className="mt-10" aria-labelledby="club-rights">
        <h2 id="club-rights" className="text-[20px] leading-tight text-ink sm:text-[22px]">{t('rights.title')}</h2>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-muted">{t('rights.lead')}</p>
        <div className="mt-4 overflow-x-auto rounded-card border border-line bg-paper">
          <table className="table-n min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" className="pl-4 sm:pl-5">{t('rights.role')}</th>
                <th scope="col">{t('rights.videos')}</th>
                <th scope="col" className="text-center">{t('rights.tag')}</th>
                <th scope="col" className="text-center">{t('rights.analytics')}</th>
                <th scope="col" className="pr-4 text-center sm:pr-5">{t('rights.manage')}</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r, ri) => {
                const x = MEMBER_RIGHTS[r]
                const last = ri === ROLES.length - 1
                const yes = (v: boolean, label: string) => v
                  ? <Check size={18} strokeWidth={2.2} className="mx-auto text-forest-600" aria-label={label} />
                  : <Minus size={18} className="mx-auto text-ink-faint" aria-label={t('rights.no')} />
                return (
                  <tr key={r}>
                    <th scope="row" className={cx('py-3 pl-4 text-[14px] font-semibold text-ink sm:pl-5', !last && 'border-b border-line/70')}>{t(`roles.${r}`)}</th>
                    <td className="text-ink-soft">{t(`rights.v.${r === 'parent' && x.videos === 'own' ? 'child' : x.videos}`)}</td>
                    <td className="text-center">{yes(x.tag, t('rights.yes'))}</td>
                    <td className="text-center">{yes(x.analytics, t('rights.yes'))}</td>
                    <td className="pr-4 text-center sm:pr-5">{yes(x.manage, t('rights.yes'))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{t('rights.note')}</p>
      </section>

      <MemberModal open={inviting} member={null} teams={data.teams} players={data.players} onClose={() => setInviting(false)} onInvited={(m) => { setInviting(false); setSharing(m) }} />
      <MemberModal open={!!editing} member={editing} teams={data.teams} players={data.players} onClose={() => setEditing(null)} onInvited={() => setEditing(null)} />
      <ShareModal member={sharing} clubName={data.club?.name ?? ''} onClose={() => setSharing(null)} />
      <ConfirmModal open={!!removing} title={t('members.removeTitle')} confirm={t('members.removeConfirm')} onClose={() => setRemoving(null)}
        body={t('members.removeBody', { name: removing?.name ?? '' })}
        onConfirm={async () => { if (removing) await db.members.delete(removing.id); setRemoving(null) }} />
    </div>
  )
}

/** Invite a member (member null) or edit one: name, e-mail, role, teams, the squad record for a player or a parent. */
function MemberModal({ open, member, teams, players, onClose, onInvited }: {
  open: boolean; member: Member | null; teams: Team[]; players: ClubData['players']; onClose: () => void; onInvited: (m: Member) => void
}) {
  const { t } = useT('club')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('coach')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [playerId, setPlayerId] = useState('')
  const [status, setStatus] = useState<Member['status']>('invited')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    setName(member?.name ?? ''); setEmail(member?.email ?? ''); setRole(member?.role ?? 'coach')
    setTeamIds(member?.teamIds ?? (teams[0] ? [teams[0].id] : [])); setPlayerId(member?.playerId ?? ''); setStatus(member?.status ?? 'invited'); setError('')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const allTeams = role === 'admin'
  const needsPlayer = role === 'player' || role === 'parent'
  const squad = players.filter((p) => teamIds.includes(p.teamId)).sort((a, b) => a.name.localeCompare(b.name))
  const toggleTeam = (id: string) => setTeamIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    const n = name.trim()
    if (!n) { setError(t('invite.nameRequired')); return }
    const ids = allTeams ? teams.map((tm) => tm.id) : teamIds
    const pid = needsPlayer && squad.some((p) => p.id === playerId) ? playerId : undefined
    if (member) {
      await db.members.update(member.id, { name: n, email: email.trim() || undefined, role, teamIds: ids, playerId: pid, status })
      onInvited({ ...member, name: n })
    } else {
      const m: Member = { id: newMemberId(), name: n, email: email.trim() || undefined, role, teamIds: ids, playerId: pid, status: 'invited', invitedAt: todayISO(), createdAt: nowISO() }
      await db.members.put(m)
      onInvited(m)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={member ? t('invite.editTitle') : t('invite.title')}
      footer={<>
        <button type="button" className="btn-ghost min-h-[44px]" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="submit" form="club-member" className="btn-primary min-h-[44px]">{member ? t('common:actions.save') : t('invite.create')}</button>
      </>}>
      <form id="club-member" onSubmit={save} noValidate>
        <Field label={t('invite.name')} htmlFor="mb-name" hint={error ? <span className="text-clay-600">{error}</span> : undefined}>
          <input id="mb-name" className={cx('input', error && 'border-clay-500')} value={name} onChange={(e) => setName(e.target.value)} autoFocus={!member} aria-invalid={!!error} />
        </Field>
        <Field label={t('invite.email')} htmlFor="mb-email" hint={t('invite.emailHint')}>
          <input id="mb-email" type="email" inputMode="email" autoComplete="off" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <fieldset className="mb-4">
          <legend className="label">{t('invite.role')}</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('invite.role')}>
            {ROLES.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                className={cx('chip min-h-[44px] cursor-pointer px-4 text-[14px]', role === r ? 'chip-on' : 'hover:border-ink-faint hover:text-ink')}>{t(`roles.${r}`)}</button>
            ))}
          </div>
          <p className="mt-1.5 text-[13px] text-ink-muted">{t(`invite.roleHint.${role}`)}</p>
        </fieldset>
        {!allTeams && teams.length > 0 && (
          <fieldset className="mb-4">
            <legend className="label">{t('invite.teams')}</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {teams.map((tm) => (
                <label key={tm.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-control px-2 text-[14.5px] text-ink-soft hover:bg-sand/60">
                  <input type="checkbox" className="h-5 w-5 accent-forest-600" checked={teamIds.includes(tm.id)} onChange={() => toggleTeam(tm.id)} />
                  {tm.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {needsPlayer && (
          <Field label={t(role === 'parent' ? 'invite.child' : 'invite.player')} htmlFor="mb-player">
            <select id="mb-player" className="input" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">{t('invite.noPlayer')}</option>
              {squad.map((p) => <option key={p.id} value={p.id}>{p.name}{p.number != null ? `, ${p.number}` : ''}</option>)}
            </select>
          </Field>
        )}
        {member && (
          <fieldset className="mb-2">
            <legend className="label">{t('invite.status')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['invited', 'active'] as const).map((s) => (
                <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}
                  className={cx('chip min-h-[44px] cursor-pointer px-4 text-[14px]', status === s ? 'chip-on' : 'hover:border-ink-faint hover:text-ink')}>{t(`invite.statuses.${s}`)}</button>
              ))}
            </div>
          </fieldset>
        )}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}

/** The invitation link, to copy or to send by WhatsApp or e-mail (the user sends it himself). */
function ShareModal({ member, clubName, onClose }: { member: Member | null; clubName: string; onClose: () => void }) {
  const { t } = useT('club')
  if (!member) return null
  const url = inviteUrl(member)
  const message = t('invite.message', { name: member.name.split(' ')[0], club: clubName, role: t(`roles.${member.role}`).toLowerCase(), link: url })
  const wa = `https://wa.me/?text=${encodeURIComponent(message)}`
  const mail = `mailto:${member.email ?? ''}?subject=${encodeURIComponent(t('invite.subject', { club: clubName }))}&body=${encodeURIComponent(message)}`
  return (
    <Modal open onClose={onClose} title={t('invite.readyTitle', { name: member.name })}
      footer={<button type="button" className="btn-primary min-h-[44px]" onClick={onClose}>{t('invite.done')}</button>}>
      <p className="text-[14.5px] leading-relaxed text-ink-soft">{t('invite.readyBody')}</p>
      <label htmlFor="mb-link" className="label mt-4">{t('invite.linkLabel')}</label>
      <input id="mb-link" className="input font-mono text-[13.5px]" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <CopyButton text={url} label={t('invite.copy')} done={t('invite.copied')} className="min-h-[44px] w-full" />
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-[44px] w-full"><MessageCircle size={16} />{t('invite.whatsapp')}</a>
        <a href={mail} className="btn-outline min-h-[44px] w-full"><Mail size={16} />{t('invite.email')}</a>
      </div>
      <p className="mt-4 rounded-card bg-sand/70 px-4 py-3 text-[13.5px] leading-relaxed text-ink-muted">{t('invite.honest')}</p>
    </Modal>
  )
}
