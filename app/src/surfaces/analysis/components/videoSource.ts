// Where a match video lives, and one small player interface for all of them.
// Ndamba never stores match videos: a film stays on the coach's device (file) or on YouTube / Facebook (link),
// and the studio drives the official players of those sites. Every coded action keeps its video time.
import type { VideoSource } from '../../../lib/types'

/** What the studio needs from a player: the subset of HTMLVideoElement it uses. */
export interface MediaLike {
  currentTime: number
  readonly duration: number
  readonly paused: boolean
  playbackRate: number
  play(): Promise<void>
  pause(): void
  /** playback speeds the source accepts (Facebook has none) */
  readonly rates: readonly number[]
  destroy?(): void
}

export interface MediaEvents {
  onReady?: (duration: number) => void
  onPlay?: () => void
  onPause?: () => void
  onError?: () => void
}

export interface ParsedLink { source: Exclude<VideoSource, 'file'>; id?: string; url: string }

/** A YouTube or Facebook video link, or null. */
export function parseVideoLink(raw: string): ParsedLink | null {
  const s = raw.trim()
  if (!s) return null
  let u: URL
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`) } catch { return null }
  const host = u.hostname.replace(/^(www|m|mobile|web)\./, '')
  const ytId = (v: string | null | undefined) => (v && /^[A-Za-z0-9_-]{11}$/.test(v) ? v : undefined)
  if (host === 'youtu.be') { const id = ytId(u.pathname.split('/')[1]); return id ? { source: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` } : null }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    const parts = u.pathname.split('/').filter(Boolean)
    const id = ytId(u.searchParams.get('v')) || (['live', 'shorts', 'embed', 'v'].includes(parts[0]) ? ytId(parts[1]) : undefined)
    return id ? { source: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` } : null
  }
  if (host === 'fb.watch' || host === 'facebook.com' || host.endsWith('.facebook.com')) {
    const ok = host === 'fb.watch' || /\/videos\/|\/watch\/?|\/reel\/|\/share\/v\/|video\.php/.test(u.pathname + (u.search.includes('v=') ? '/watch/' : ''))
    return ok ? { source: 'facebook', url: u.toString() } : null
  }
  return null
}

/* ------------------------------------------------------------------ YouTube */

type YTPlayer = {
  playVideo(): void; pauseVideo(): void; seekTo(s: number, allow: boolean): void; getCurrentTime(): number; getDuration(): number
  getPlayerState(): number; setPlaybackRate(r: number): void; getPlaybackRate(): number; getAvailablePlaybackRates(): number[]; destroy(): void
}
type YTNamespace = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer; PlayerState: { PLAYING: number } }
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void; FB?: FBNamespace; fbAsyncInit?: () => void } }

let ytLoading: Promise<YTNamespace> | null = null
function loadYouTube(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!ytLoading) {
    ytLoading = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); if (window.YT) resolve(window.YT) }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      s.async = true
      s.onerror = () => { ytLoading = null; reject(new Error('youtube')) }
      document.head.appendChild(s)
    })
  }
  return ytLoading
}

class YouTubeMedia implements MediaLike {
  private p: YTPlayer | null = null
  private wanted = 0
  rates: readonly number[] = [0.5, 1, 2]
  constructor(host: HTMLElement, id: string, ev: MediaEvents) {
    const el = document.createElement('div')
    host.appendChild(el)
    loadYouTube().then((YT) => {
      this.p = new YT.Player(el, {
        videoId: id,
        host: 'https://www.youtube-nocookie.com',
        width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 1 },
        events: {
          onReady: () => { if (this.wanted) this.p?.seekTo(this.wanted, true); ev.onReady?.(this.p?.getDuration() ?? 0) },
          onStateChange: (e: { data: number }) => { if (e.data === YT.PlayerState.PLAYING) ev.onPlay?.(); else if (e.data === 2 || e.data === 0) ev.onPause?.() },
          onError: () => ev.onError?.(),
        },
      })
    }).catch(() => ev.onError?.())
  }
  get currentTime() { try { return this.p?.getCurrentTime() ?? this.wanted } catch { return this.wanted } }
  set currentTime(v: number) { this.wanted = v; try { this.p?.seekTo(v, true) } catch { /* not ready yet */ } }
  get duration() { try { return this.p?.getDuration() ?? 0 } catch { return 0 } }
  get paused() { try { return this.p ? this.p.getPlayerState() !== 1 : true } catch { return true } }
  get playbackRate() { try { return this.p?.getPlaybackRate() ?? 1 } catch { return 1 } }
  set playbackRate(r: number) { try { this.p?.setPlaybackRate(r) } catch { /* ignore */ } }
  play() { try { this.p?.playVideo() } catch { /* ignore */ } return Promise.resolve() }
  pause() { try { this.p?.pauseVideo() } catch { /* ignore */ } }
  destroy() { try { this.p?.destroy() } catch { /* ignore */ } }
}

/* ------------------------------------------------------------------ Facebook */

type FBVideo = { play(): void; pause(): void; seek(s: number): void; getCurrentPosition(): number; getDuration(): number; subscribe(ev: string, fn: () => void): { release(): void } }
type FBNamespace = { init(o: Record<string, unknown>): void; XFBML: { parse(el?: HTMLElement): void }; Event: { subscribe(ev: string, fn: (msg: { type: string; id: string; instance: FBVideo }) => void): void } }

let fbLoading: Promise<FBNamespace> | null = null
function loadFacebook(lang: string): Promise<FBNamespace> {
  if (window.FB) return Promise.resolve(window.FB)
  if (!fbLoading) {
    fbLoading = new Promise((resolve, reject) => {
      window.fbAsyncInit = () => { window.FB?.init({ xfbml: false, version: 'v19.0' }); if (window.FB) resolve(window.FB) }
      const s = document.createElement('script')
      s.src = `https://connect.facebook.net/${lang === 'en' ? 'en_US' : 'fr_FR'}/sdk.js`
      s.async = true
      s.crossOrigin = 'anonymous'
      s.onerror = () => { fbLoading = null; reject(new Error('facebook')) }
      document.head.appendChild(s)
    })
  }
  return fbLoading
}

class FacebookMedia implements MediaLike {
  private v: FBVideo | null = null
  private playing = false
  private wanted = 0
  rates: readonly number[] = [1]
  constructor(host: HTMLElement, url: string, lang: string, ev: MediaEvents) {
    const id = `fbv_${Math.random().toString(36).slice(2, 9)}`
    const el = document.createElement('div')
    el.className = 'fb-video'
    el.id = id
    el.setAttribute('data-href', url)
    el.setAttribute('data-width', 'auto')
    el.setAttribute('data-allowfullscreen', 'true')
    host.appendChild(el)
    loadFacebook(lang).then((FB) => {
      FB.Event.subscribe('xfbml.ready', (msg) => {
        if (msg.type !== 'video' || msg.id !== id) return
        this.v = msg.instance
        this.v.subscribe('startedPlaying', () => { this.playing = true; ev.onPlay?.() })
        this.v.subscribe('paused', () => { this.playing = false; ev.onPause?.() })
        this.v.subscribe('finishedPlaying', () => { this.playing = false; ev.onPause?.() })
        this.v.subscribe('error', () => ev.onError?.())
        if (this.wanted) this.v.seek(this.wanted)
        ev.onReady?.(this.v.getDuration())
      })
      FB.XFBML.parse(host)
    }).catch(() => ev.onError?.())
  }
  get currentTime() { try { return this.v?.getCurrentPosition() ?? this.wanted } catch { return this.wanted } }
  set currentTime(s: number) { this.wanted = s; try { this.v?.seek(s) } catch { /* not ready */ } }
  get duration() { try { return this.v?.getDuration() ?? 0 } catch { return 0 } }
  get paused() { return !this.playing }
  get playbackRate() { return 1 }
  set playbackRate(_r: number) { /* Facebook players have one speed */ }
  play() { try { this.v?.play() } catch { /* ignore */ } return Promise.resolve() }
  pause() { try { this.v?.pause() } catch { /* ignore */ } }
}

/** Mounts the official player of a link inside `host`. */
export function mountLinkPlayer(host: HTMLElement, link: ParsedLink, lang: string, ev: MediaEvents): MediaLike {
  host.innerHTML = ''
  return link.source === 'youtube' && link.id ? new YouTubeMedia(host, link.id, ev) : new FacebookMedia(host, link.url, lang, ev)
}

/** An HTMLVideoElement seen through the same interface. */
export function fileMedia(el: HTMLVideoElement): MediaLike {
  return {
    get currentTime() { return el.currentTime },
    set currentTime(v: number) { el.currentTime = v },
    get duration() { return el.duration },
    get paused() { return el.paused },
    get playbackRate() { return el.playbackRate },
    set playbackRate(r: number) { el.playbackRate = r },
    play: () => el.play(),
    pause: () => el.pause(),
    rates: [0.5, 1, 2],
  }
}
