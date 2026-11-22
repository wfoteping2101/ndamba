// Paid video hosting on Ndamba (« Envoyer sur Ndamba »): plans, limits, what a file weighs and lasts.
// Payments and storage are not connected yet (api/upload.ts answers 501): the upload runs as a demonstration,
// the file stays on the device and plays from an object URL for this browser session only.
import { VIDEO_HOSTING } from '../../lib/config'
import type { Hosting, VideoProject } from '../../lib/types'
import { nowISO, todayISO } from '../../lib/util'

/** Object URLs of demonstration uploads made in this page session. After a reload they are gone: the studio asks for the file again. */
export const LIVE_BLOBS = new Set<string>()
export function demoUrl(file: File) { const u = URL.createObjectURL(file); LIVE_BLOBS.add(u); return u }

export type HostPlan = Hosting['plan']
export interface FileMeta { file: File; name: string; sizeMB: number; duration: number | null }

/** Size and duration, read in the browser (nothing leaves the device). */
export function readVideoMeta(file: File): Promise<FileMeta> {
  const base = { file, name: file.name, sizeMB: Math.round((file.size / (1024 * 1024)) * 10) / 10 }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    let done = false
    const finish = (duration: number | null) => { if (done) return; done = true; URL.revokeObjectURL(url); v.removeAttribute('src'); resolve({ ...base, duration }) }
    v.preload = 'metadata'
    v.muted = true
    v.onloadedmetadata = () => finish(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null)
    v.onerror = () => finish(null)
    window.setTimeout(() => finish(null), 8000)
    v.src = url
  })
}

/** What blocks a file for a plan: too big or too long for a Pass match, or longer than a month of Club vidéo. */
export function limitError(plan: HostPlan, meta: Pick<FileMeta, 'sizeMB' | 'duration'>, usedThisMonth = 0): 'tooBig' | 'tooLong' | 'monthFull' | null {
  if (plan === 'pass') {
    if (meta.sizeMB > VIDEO_HOSTING.pass.maxGB * 1024) return 'tooBig'
    if ((meta.duration ?? 0) > VIDEO_HOSTING.pass.maxHours * 3600) return 'tooLong'
    return null
  }
  if (usedThisMonth + (meta.duration ?? 0) > VIDEO_HOSTING.club.hoursPerMonth * 3600) return 'monthFull'
  return null
}

export function addMonthsISO(iso: string, months: number) {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

export function makeHosting(plan: HostPlan, sizeMB: number): Hosting {
  const uploadedAt = nowISO()
  return { plan, sizeMB, uploadedAt, expiresAt: addMonthsISO(uploadedAt, plan === 'pass' ? VIDEO_HOSTING.pass.months : VIDEO_HOSTING.club.months), demo: true }
}

/** Seconds of Club vidéo uploads this calendar month on this device. */
export function clubSecondsThisMonth(videos: readonly VideoProject[]) {
  const month = todayISO().slice(0, 7)
  return videos.filter((v) => v.hosting?.plan === 'club' && v.hosting.uploadedAt.slice(0, 7) === month).reduce((a, v) => a + (v.duration ?? 0), 0)
}

export function fmtSize(mb: number, lang: 'fr' | 'en') {
  const nf = (v: number, d: number) => v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: d })
  return mb >= 1024 ? `${nf(mb / 1024, 2)} ${lang === 'fr' ? 'Go' : 'GB'}` : `${nf(mb, mb < 10 ? 1 : 0)} ${lang === 'fr' ? 'Mo' : 'MB'}`
}

export function fmtDuration(s: number, lang: 'fr' | 'en') {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60)
  if (h === 0) return s < 60 ? `${Math.max(1, Math.round(s))} s` : `${m} min`
  return lang === 'fr' ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h ${m} min`
}
