import { Logger } from '@nestjs/common'
import {
  escapeHtml,
  renderMagicLinkEmail,
  renderResetEmail,
  renderVerificationEmail,
} from '@repo/email'
import { DICEBEAR_CDN_BASE } from '@repo/types'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { magicLink } from 'better-auth/plugins/magic-link'
import { organization } from 'better-auth/plugins/organization'
import { eq } from 'drizzle-orm'
import { buildFrontendUrl } from '../common/url.util.js'
import { toError } from '../common/utils/toError.js'
import type { DrizzleDB } from '../database/drizzle.provider.js'
import { users } from '../database/schema/auth.schema.js'
import type { EmailProvider } from '../email/email.provider.js'

const logger = new Logger('AuthInstance')

const SUPPORTED_LOCALES = ['en', 'fr']

// Better Auth does not infer additionalFields on callback user parameters.
// The locale field is declared in user.additionalFields above but the callback
// type only includes core fields. This assertion is necessary until Better Auth
// improves its type inference.
type UserWithLocale = { locale?: string }

export type AuthInstanceConfig = {
  secret: string
  baseURL: string
  appURL?: string
  googleClientId?: string
  googleClientSecret?: string
  githubClientId?: string
  githubClientSecret?: string
}

export type OrganizationCreatedCallback = (data: {
  organizationId: string
  creatorUserId: string
}) => void | Promise<void>

function buildSocialProviders(config: AuthInstanceConfig): Record<string, unknown> {
  const socialProviders: Record<string, unknown> = {}
  if (config.googleClientId && config.googleClientSecret) {
    socialProviders.google = {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
    }
  }
  if (config.githubClientId && config.githubClientSecret) {
    socialProviders.github = {
      clientId: config.githubClientId,
      clientSecret: config.githubClientSecret,
    }
  }
  return socialProviders
}

function buildEmailAndPasswordConfig(emailProvider: EmailProvider, config: AuthInstanceConfig) {
  return {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({
      user,
      url,
    }: {
      user: { email: string } & UserWithLocale
      url: string
    }) {
      const emailUrl = buildFrontendUrl(url, config.appURL, '/reset-password/confirm')

      let emailContent: { html: string; text?: string; subject: string }
      try {
        const locale = (user as UserWithLocale).locale ?? 'en'
        const { html, text, subject } = await renderResetEmail(emailUrl, locale, config.appURL)
        emailContent = { html, text, subject }
      } catch {
        logger.warn('Failed to render reset password email template, using plain fallback')
        emailContent = {
          subject: 'Reset your password',
          html: `<p>Click <a href="${escapeHtml(emailUrl)}">here</a> to reset your password.</p>`,
          text: `Reset your password: ${emailUrl}`,
        }
      }

      try {
        await emailProvider.send({ to: user.email, ...emailContent })
      } catch (error) {
        const cause = toError(error)
        logger.error(`Failed to send reset password email to ${user.email}`, cause.stack)
        throw new APIError('INTERNAL_SERVER_ERROR', { message: 'EMAIL_SEND_FAILED' })
      }
    },
  }
}

function buildEmailVerificationConfig(emailProvider: EmailProvider, config: AuthInstanceConfig) {
  return {
    // Better Auth applies server-side rate limiting on verification email sends
    // (rateLimit plugin). Client-side cooldown (60s) is UX guidance only.
    // Server-side rate limiting is the hard limit. See issue #53 for additional
    // rate limiting.
    sendOnSignIn: true,
    async sendVerificationEmail({
      user,
      url,
    }: {
      user: { email: string } & UserWithLocale
      url: string
    }) {
      const emailUrl = buildFrontendUrl(url, config.appURL, '/verify-email')

      let emailContent: { html: string; text?: string; subject: string }
      try {
        const locale = (user as UserWithLocale).locale ?? 'en'
        const { html, text, subject } = await renderVerificationEmail(
          emailUrl,
          locale,
          config.appURL
        )
        emailContent = { html, text, subject }
      } catch {
        logger.warn('Failed to render verification email template, using plain fallback')
        emailContent = {
          subject: 'Verify your email',
          html: `<p>Click <a href="${escapeHtml(emailUrl)}">here</a> to verify your email.</p>`,
          text: `Verify your email: ${emailUrl}`,
        }
      }

      try {
        await emailProvider.send({ to: user.email, ...emailContent })
      } catch (error) {
        const cause = toError(error)
        logger.error(`Failed to send verification email to ${user.email}`, cause.stack)
        throw new APIError('INTERNAL_SERVER_ERROR', { message: 'EMAIL_SEND_FAILED' })
      }
    },
  }
}

function buildMagicLinkPlugin(
  db: DrizzleDB,
  emailProvider: EmailProvider,
  config: AuthInstanceConfig
) {
  return magicLink({
    async sendMagicLink({ email, url }) {
      const emailUrl = buildFrontendUrl(url, config.appURL, '/magic-link/verify')

      const [userData] = await db
        .select({ locale: users.locale })
        .from(users)
        .where(eq(users.email, email))

      if (!userData) {
        throw new APIError('BAD_REQUEST', { message: 'USER_NOT_FOUND' })
      }

      let emailContent: { html: string; text?: string; subject: string }
      try {
        const locale = userData.locale ?? 'en'
        const { html, text, subject } = await renderMagicLinkEmail(emailUrl, locale, config.appURL)
        emailContent = { html, text, subject }
      } catch {
        logger.warn('Failed to render magic link email template, using plain fallback')
        emailContent = {
          subject: 'Sign in to Roxabi',
          html: `<p>Click <a href="${escapeHtml(emailUrl)}">here</a> to sign in.</p>`,
          text: `Sign in to Roxabi: ${emailUrl}`,
        }
      }

      try {
        await emailProvider.send({ to: email, ...emailContent })
      } catch (error) {
        const cause = toError(error)
        logger.error(`Failed to send magic link email to ${email}`, cause.stack)
        throw new APIError('INTERNAL_SERVER_ERROR', { message: 'EMAIL_SEND_FAILED' })
      }
    },
  })
}

function buildOrganizationPlugin(onOrganizationCreated?: OrganizationCreatedCallback) {
  return organization({
    schema: {
      organization: {
        additionalFields: {
          deletedAt: { type: 'date', required: false, input: false },
          deleteScheduledFor: { type: 'date', required: false, input: false },
        },
      },
    },
    organizationHooks: onOrganizationCreated
      ? {
          afterCreateOrganization: async ({ organization: org, member }) => {
            onOrganizationCreated({
              organizationId: org.id,
              creatorUserId: member.userId,
            })
          },
        }
      : undefined,
  })
}

export function createBetterAuth(
  db: DrizzleDB,
  emailProvider: EmailProvider,
  config: AuthInstanceConfig,
  onOrganizationCreated?: OrganizationCreatedCallback
) {
  const trustedOrigins = config.appURL ? [config.appURL] : []

  return betterAuth({
    basePath: '/api/auth',
    secret: config.secret,
    baseURL: config.baseURL,
    trustedOrigins,
    user: {
      additionalFields: {
        locale: { type: 'string', required: false, defaultValue: 'en', input: true },
        role: { type: 'string', required: false, defaultValue: 'user', input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              const updateFields: Record<string, unknown> = {
                avatarStyle: 'lorelei',
                avatarSeed: user.id,
                avatarOptions: {},
              }
              if (!user.image) {
                updateFields.image = `${DICEBEAR_CDN_BASE}/lorelei/svg?seed=${user.id}`
              }
              // Sanitize locale: only allow supported locales, default to 'en'.
              // The `input: true` on additionalFields allows arbitrary strings from
              // the client, so we enforce valid values server-side.
              const userLocale = (user as UserWithLocale).locale
              if (userLocale && !SUPPORTED_LOCALES.includes(userLocale)) {
                updateFields.locale = 'en'
              }
              await db.update(users).set(updateFields).where(eq(users.id, user.id))
            } catch (error) {
              logger.warn('Failed to set default avatar for user', { userId: user.id, error })
            }
          },
        },
      },
    },
    database: drizzleAdapter(db, { provider: 'pg', usePlural: true }),
    emailAndPassword: buildEmailAndPasswordConfig(emailProvider, config),
    emailVerification: buildEmailVerificationConfig(emailProvider, config),
    socialProviders: buildSocialProviders(config),
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [
      buildOrganizationPlugin(onOrganizationCreated),
      // Better Auth admin plugin disabled in Phase 1 (#268)
      // All admin actions go through NestJS AdminModule with guards + audit logging.
      // The plugin exposed /api/auth/admin/* endpoints that bypassed NestJS guards entirely.
      buildMagicLinkPlugin(db, emailProvider, config),
    ],
  })
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>
