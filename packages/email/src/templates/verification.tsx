import { ActionEmail } from '../components/ActionEmail'
import type { Translations } from '../translations/types'

type VerificationEmailProps = {
  url: string
  translations: Translations['verification']
  locale: string
  appUrl?: string
  appName?: string
}

export function VerificationEmail(props: VerificationEmailProps) {
  return <ActionEmail {...props} />
}
