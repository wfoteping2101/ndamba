import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function LiveTagger() {
  useDocumentTitle('LiveTagger')
  return <PageHeader eyebrow="Njangi" title="LiveTagger" subtitle="En construction." />
}
