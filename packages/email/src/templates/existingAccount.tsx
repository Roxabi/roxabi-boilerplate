import { ActionEmail } from '../components/ActionEmail'
import type { Translations } from '../translations/types'

type ExistingAccountEmailProps = {
  url: string
  translations: Translations['existingAccount']
  locale: string
  appUrl?: string
}

export function ExistingAccountEmail(props: ExistingAccountEmailProps) {
  return <ActionEmail {...props} />
}
