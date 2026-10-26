import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function Settings() {
  useDocumentTitle('Settings')
  return <PageHeader eyebrow="Njangi" title="Settings" subtitle="En construction." />
}
