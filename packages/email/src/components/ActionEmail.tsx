import { Button, Link, Text } from '@react-email/components'
import type { EmailTemplateStrings } from '../translations/types'
import { BRAND_COLOR, EmailLayout } from './Layout'

type ActionEmailProps = {
  url: string
  translations: EmailTemplateStrings
  locale: string
  appUrl?: string
  appName?: string
}

export function ActionEmail({ url, translations, locale, appUrl, appName }: ActionEmailProps) {
  return (
    <EmailLayout preview={translations.subject} locale={locale} appUrl={appUrl} appName={appName}>
      <Text style={headingStyle}>{translations.heading}</Text>
      <Text style={bodyTextStyle}>{translations.body}</Text>
      <Button style={buttonStyle} href={url}>
        {translations.cta}
      </Button>
      <Text style={expiryStyle}>{translations.expiry}</Text>
      <Text style={footerDisclaimerStyle}>{translations.footer}</Text>
      <Text style={urlFallbackStyle}>
        <Link href={url} style={urlLinkStyle}>
          {url}
        </Link>
      </Text>
    </EmailLayout>
  )
}

const headingStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#1a1a1a',
  margin: '0 0 16px',
}

const bodyTextStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4a4a4a',
  margin: '0 0 24px',
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: BRAND_COLOR,
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const expiryStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#8898aa',
  margin: '24px 0 0',
}

const footerDisclaimerStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8898aa',
  margin: '16px 0 0',
  lineHeight: '20px',
}

const urlFallbackStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8898aa',
  margin: '16px 0 0',
  wordBreak: 'break-all',
}

const urlLinkStyle: React.CSSProperties = {
  color: '#8898aa',
  textDecoration: 'underline',
}
