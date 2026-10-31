// The words written on the pitch diagrams are French in the sources (books and drills).
// In English, the app shows them translated: static diagrams, animations and their captions.
import { DIAGRAM_LABELS_EN } from '../content/diagramLabels.gen'
import type { DiagramSpec } from './types'

export function diagramLabel(text: string, lang: string): string {
  return lang === 'en' ? DIAGRAM_LABELS_EN[text] ?? text : text
}

/** The same diagram with its labels and zone names in the given language. */
export function localizeDiagram(spec: DiagramSpec, lang: string): DiagramSpec {
  if (lang !== 'en') return spec
  return {
    ...spec,
    labels: spec.labels?.map((l) => ({ ...l, text: diagramLabel(l.text, lang) })),
    zones: spec.zones?.map((z) => (z.label ? { ...z, label: diagramLabel(z.label, lang) } : z)),
  }
}
