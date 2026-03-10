export type EmailTemplateStrings = {
  subject: string
  heading: string
  body: string
  cta: string
  expiry: string
  footer: string
}

export type Translations = {
  verification: EmailTemplateStrings
  reset: EmailTemplateStrings
  magicLink: EmailTemplateStrings
  existingAccount: EmailTemplateStrings
}
