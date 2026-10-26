import { PageHeader } from '../../ui'
import { useDocumentTitle } from '../../lib/hooks'

// PLACEHOLDER: replaced by the owner of this surface (see docs/CONVENTIONS.md).
export default function Onboarding() {
  useDocumentTitle('Onboarding')
  return <PageHeader eyebrow="Njangi" title="Onboarding" subtitle="En construction." />
}
