import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function Roster() {
  useDocumentTitle('Roster')
  return <PageHeader eyebrow="Njangi" title="Roster" subtitle="En construction." />
}
