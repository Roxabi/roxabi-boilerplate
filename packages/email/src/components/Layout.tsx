import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

const BRAND_COLOR = '#6366f1'

type EmailLayoutProps = {
  children: ReactNode
  preview: string
  locale: string
  appUrl?: string
  appName?: string
}

export function EmailLayout({
  children,
  preview,
  locale,
  appUrl = '/',
  appName = 'App',
}: EmailLayoutProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={logoStyle}>{appName}</Text>
          </Section>
          <Section style={contentStyle}>{children}</Section>
          <Hr style={hrStyle} />
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              &copy; {new Date().getFullYear()}{' '}
              <Link href={appUrl} style={footerLinkStyle}>
                {appName}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  margin: 0,
  padding: 0,
}

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px 0 48px',
}

const headerStyle: React.CSSProperties = {
  padding: '32px 20px 0',
}

const logoStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: BRAND_COLOR,
  textDecoration: 'none',
  margin: 0,
}

const contentStyle: React.CSSProperties = {
  padding: '24px 20px',
}

const hrStyle: React.CSSProperties = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const footerStyle: React.CSSProperties = {
  padding: '0 20px',
}

const footerTextStyle: React.CSSProperties = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
}

const footerLinkStyle: React.CSSProperties = {
  color: '#8898aa',
  textDecoration: 'underline',
}

export { BRAND_COLOR }
