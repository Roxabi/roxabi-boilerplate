import { ActionEmail } from '../components/ActionEmail'
import type { Translations } from '../translations/types'

type MagicLinkEmailProps = {
  url: string
  translations: Translations['magicLink']
  locale: string
  appUrl?: string
  appName?: string
}

export function MagicLinkEmail(props: MagicLinkEmailProps) {
  return <ActionEmail {...props} />
}
