import { render } from '@react-email/components'
import { createElement } from 'react'
import { ExistingAccountEmail } from './templates/existingAccount'
import { MagicLinkEmail } from './templates/magicLink'
import { ResetPasswordEmail } from './templates/resetPassword'
import { VerificationEmail } from './templates/verification'
import { getTranslations } from './translations'

export type EmailRenderResult = {
  html: string
  text: string
  subject: string
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function renderVerificationEmail(
  url: string,
  locale: string,
  appUrl?: string
): Promise<EmailRenderResult> {
  const translations = getTranslations(locale)

  const element = createElement(VerificationEmail, {
    url,
    translations: translations.verification,
    locale,
    appUrl,
  })
  const html = await render(element)
  const text = await render(element, { plainText: true })

  return { html, text, subject: translations.verification.subject }
}

export async function renderResetEmail(
  url: string,
  locale: string,
  appUrl?: string
): Promise<EmailRenderResult> {
  const translations = getTranslations(locale)

  const element = createElement(ResetPasswordEmail, {
    url,
    translations: translations.reset,
    locale,
    appUrl,
  })
  const html = await render(element)
  const text = await render(element, { plainText: true })

  return { html, text, subject: translations.reset.subject }
}

export async function renderMagicLinkEmail(
  url: string,
  locale: string,
  appUrl?: string
): Promise<EmailRenderResult> {
  const translations = getTranslations(locale)

  const element = createElement(MagicLinkEmail, {
    url,
    translations: translations.magicLink,
    locale,
    appUrl,
  })
  const html = await render(element)
  const text = await render(element, { plainText: true })

  return { html, text, subject: translations.magicLink.subject }
}

export async function renderExistingAccountEmail(
  loginUrl: string,
  locale: string,
  appUrl?: string
): Promise<EmailRenderResult> {
  const translations = getTranslations(locale)

  const element = createElement(ExistingAccountEmail, {
    url: loginUrl,
    translations: translations.existingAccount,
    locale,
    appUrl,
  })
  const html = await render(element)
  const text = await render(element, { plainText: true })

  return { html, text, subject: translations.existingAccount.subject }
}
