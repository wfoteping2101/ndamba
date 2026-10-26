import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function PlayerSpace() {
  useDocumentTitle('PlayerSpace')
  return <PageHeader eyebrow="Njangi" title="PlayerSpace" subtitle="En construction." />
}
