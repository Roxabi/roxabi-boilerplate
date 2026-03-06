import type { Translations } from './types'

export const en: Translations = {
  verification: {
    subject: 'Verify your email',
    heading: 'Verify your email address',
    body: 'Click the button below to verify your email address.',
    cta: 'Verify email',
    expiry: 'This link expires in 24 hours.',
    footer: 'If you did not create an account, you can safely ignore this email.',
  },
  reset: {
    subject: 'Reset your password',
    heading: 'Reset your password',
    body: 'Click the button below to reset your password.',
    cta: 'Reset password',
    expiry: 'This link expires in 1 hour.',
    footer: 'If you did not request a password reset, you can safely ignore this email.',
  },
  magicLink: {
    subject: 'Sign in to Roxabi',
    heading: 'Sign in to Roxabi',
    body: 'Click the button below to sign in to your account.',
    cta: 'Sign in',
    expiry: 'This link expires in 5 minutes.',
    footer: 'If you did not request this link, you can safely ignore this email.',
  },
  existingAccount: {
    subject: 'Someone tried to sign up with your email',
    heading: 'New sign-up attempt',
    body: 'Someone tried to create an account using your email address. If this was you, sign in to your existing account instead.',
    cta: 'Sign in',
    expiry: 'This is an automated security notification.',
    footer: 'If you did not attempt to sign up, you can safely ignore this email.',
  },
}
