import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function VideoStudio() {
  useDocumentTitle('VideoStudio')
  return <PageHeader eyebrow="Njangi" title="VideoStudio" subtitle="En construction." />
}
