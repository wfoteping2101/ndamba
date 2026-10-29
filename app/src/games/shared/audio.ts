// Procedural sound for both games (WebAudio, nothing to download): a ball strike, a whistle,
// a point chime, success and failure cues, the net, a soft crowd or street ambience.
// Volume and mute persist in localStorage; the context starts on the first user gesture.
const KEY = 'ndamba.jeux.audio'

export interface AudioSettings { volume: number; muted: boolean; ambience: boolean }
export function loadAudio(): AudioSettings {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s.volume === 'number') return { ambience: true, ...s } } catch { /* ignore */ }
  return { volume: 0.7, muted: false, ambience: true }
}
let settings = loadAudio()
export function saveAudio(s: AudioSettings) {
  settings = s
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ }
  if (master) master.gain.value = s.muted ? 0 : s.volume
  if (amb) amb.gain.value = s.ambience ? 0.06 : 0
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let amb: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  // browsers refuse sound before the first tap or key: stay silent until then (cutscenes start alone)
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  if (!ctx && ua && !ua.hasBeenActive) return null
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    try { ctx = new C() } catch { return null }
    master = ctx.createGain()
    master.gain.value = settings.muted ? 0 : settings.volume
    master.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, at = 0, slide = 0) {
  const c = ac(); if (!c || !master) return
  const t = c.currentTime + at
  const o = c.createOscillator(); const g = c.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02)
}
function noise(dur: number, gain: number, filter: number, at = 0, q = 0.8, type: BiquadFilterType = 'bandpass') {
  const c = ac(); if (!c || !master || !noiseBuf) return
  const t = c.currentTime + at
  const s = c.createBufferSource(); s.buffer = noiseBuf
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = filter; f.Q.value = q
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02)
}

export type Sfx = 'kick' | 'touch' | 'whistle' | 'point' | 'success' | 'fail' | 'net' | 'post' | 'tap' | 'page'
export function sfx(k: Sfx) {
  if (settings.muted) return
  switch (k) {
    case 'kick': tone(120, 0.12, 'sine', 0.55, 0, 0.45); noise(0.06, 0.35, 900, 0, 1.2); break
    case 'touch': tone(160, 0.06, 'sine', 0.22, 0, 0.6); break
    case 'whistle': tone(2350, 0.32, 'square', 0.06); tone(2480, 0.32, 'square', 0.04); break
    case 'point': tone(880, 0.12, 'triangle', 0.18); tone(1320, 0.18, 'triangle', 0.14, 0.07); break
    case 'success': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'triangle', 0.16, i * 0.09)); break
    case 'fail': tone(330, 0.3, 'triangle', 0.15, 0, 0.7); tone(247, 0.4, 'triangle', 0.12, 0.16, 0.8); break
    case 'net': noise(0.5, 0.3, 2600, 0, 0.5, 'highpass'); break
    case 'post': tone(1900, 0.5, 'sine', 0.12, 0, 0.98); tone(2870, 0.35, 'sine', 0.06); break
    case 'tap': tone(660, 0.05, 'sine', 0.08); break
    case 'page': noise(0.18, 0.12, 3000, 0, 0.6, 'highpass'); break
  }
}

/** Crowd murmur (stadium) or a street (birds and wind) under the scene. */
export function ambience(kind: 'crowd' | 'street' | 'none') {
  const c = ac(); if (!c || !master || !noiseBuf) return () => {}
  if (kind === 'none') return () => {}
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'crowd' ? 700 : 400
  amb = c.createGain(); amb.gain.value = settings.ambience ? (kind === 'crowd' ? 0.06 : 0.025) : 0
  s.connect(f); f.connect(amb); amb.connect(master); s.start()
  let birds = 0
  if (kind === 'street') birds = window.setInterval(() => { if (Math.random() < 0.5 && settings.ambience) { const b = 2400 + Math.random() * 1600; tone(b, 0.09, 'sine', 0.025, 0, 1.25); tone(b * 1.1, 0.07, 'sine', 0.02, 0.12, 0.9) } }, 1700)
  return () => { try { s.stop() } catch { /* already stopped */ } s.disconnect(); window.clearInterval(birds) }
}
