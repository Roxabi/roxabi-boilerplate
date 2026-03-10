import { ActionEmail } from '../components/ActionEmail'
import type { Translations } from '../translations/types'

type ResetPasswordEmailProps = {
  url: string
  translations: Translations['reset']
  locale: string
  appUrl?: string
  appName?: string
}

export function ResetPasswordEmail(props: ResetPasswordEmailProps) {
  return <ActionEmail {...props} />
}
