import { Logger } from '@nestjs/common'
import {
  escapeHtml,
  renderExistingAccountEmail,
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
import type { DrizzleDB } from '../database/drizzle.provider.js'
import { users } from '../database/schema/auth.schema.js'
import type { QueueEnqueuer } from '../queue/queue.provider.js'
import { renderEmailTemplate, sendTemplatedEmail } from './helpers/sendTemplatedEmail.js'

const logger = new Logger('AuthInstance')

const SUPPORTED_LOCALES = ['en', 'fr']

const SESSION_EXPIRES_IN = 60 * 60 * 24 * 7 // 7 days
const SESSION_UPDATE_AGE = 60 * 60 * 24 // 24 hours
const SESSION_COOKIE_CACHE_MAX_AGE = 5 * 60 // 5 minutes

// Better Auth does not infer additionalFields on callback user parameters.
// The locale field is declared in user.additionalFields above but the callback
// type only includes core fields. This assertion is necessary until Better Auth
// improves its type inference.
type UserWithLocale = { locale?: string }

export type AuthInstanceConfig = {
  secret: string
  baseURL: string
  appURL?: string
  appName: string
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

function buildEmailAndPasswordConfig(queueService: QueueEnqueuer, config: AuthInstanceConfig) {
  return {
    enabled: true,
    requireEmailVerification: true,
    async onExistingUserSignUp({ user }: { user: { email: string } & UserWithLocale }) {
      // No token URL to transform — construct login URL directly
      const loginUrl = config.appURL ? `${config.appURL}/login` : '/login'
      const locale = user.locale ?? 'en'

      const emailContent = await renderEmailTemplate(
        async () =>
          renderExistingAccountEmail(loginUrl, locale, {
            appUrl: config.appURL,
            appName: config.appName,
          }),
        {
          subject: 'Someone tried to sign up with your email',
          html: `<p>Someone tried to create an account using your email. <a href="${escapeHtml(loginUrl)}">Sign in</a> to your existing account instead.</p>`,
          text: `Someone tried to create an account using your email. Sign in instead: ${loginUrl}`,
        },
        logger,
        'Failed to render existing account email template, using plain fallback'
      )

      // Best-effort: unlike other handlers, must not throw — would break enumeration protection
      await sendTemplatedEmail(
        queueService,
        user.email,
        emailContent,
        logger,
        `Failed to enqueue existing account notification to ${user.email}`,
        false
      )
    },
    async sendResetPassword({
      user,
      url,
    }: {
      user: { email: string } & UserWithLocale
      url: string
    }) {
      const emailUrl = buildFrontendUrl(url, config.appURL, '/reset-password/confirm')
      const locale = (user as UserWithLocale).locale ?? 'en'

      const emailContent = await renderEmailTemplate(
        async () =>
          renderResetEmail(emailUrl, locale, {
            appUrl: config.appURL,
            appName: config.appName,
          }),
        {
          subject: 'Reset your password',
          html: `<p>Click <a href="${escapeHtml(emailUrl)}">here</a> to reset your password.</p>`,
          text: `Reset your password: ${emailUrl}`,
        },
        logger,
        'Failed to render reset password email template, using plain fallback'
      )

      await sendTemplatedEmail(
        queueService,
        user.email,
        emailContent,
        logger,
        `Failed to enqueue reset password email to ${user.email}`
      )
    },
  }
}

function buildEmailVerificationConfig(queueService: QueueEnqueuer, config: AuthInstanceConfig) {
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
      const locale = (user as UserWithLocale).locale ?? 'en'

      const emailContent = await renderEmailTemplate(
        async () =>
          renderVerificationEmail(emailUrl, locale, {
            appUrl: config.appURL,
            appName: config.appName,
          }),
        {
          subject: 'Verify your email',
          html: `<p>Click <a href="${escapeHtml(emailUrl)}">here</a> to verify your email.</p>`,
          text: `Verify your email: ${emailUrl}`,
        },
        logger,
        'Failed to render verification email template, using plain fallback'
      )

      await sendTemplatedEmail(
        queueService,
        user.email,
        emailContent,
        logger,
        `Failed to enqueue verification email to ${user.email}`
      )
    },
  }
}

function buildMagicLinkPlugin(
  db: DrizzleDB,
  queueService: QueueEnqueuer,
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

      const locale = userData.locale ?? 'en'

      const emailContent = await renderEmailTemplate(
        async () =>
          renderMagicLinkEmail(emailUrl, locale, {
            appUrl: config.appURL,
            appName: config.appName,
          }),
        {
          subject: `Sign in to ${escapeHtml(config.appName)}`,
          html: `<p>Click <a href="${escapeHtml(emailUrl)}">here</a> to sign in.</p>`,
          text: `Sign in to ${escapeHtml(config.appName)}: ${emailUrl}`,
        },
        logger,
        'Failed to render magic link email template, using plain fallback'
      )

      await sendTemplatedEmail(
        queueService,
        email,
        emailContent,
        logger,
        `Failed to enqueue magic link email to ${email}`
      )
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
            await onOrganizationCreated({
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
  queueService: QueueEnqueuer,
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
    emailAndPassword: buildEmailAndPasswordConfig(queueService, config),
    emailVerification: buildEmailVerificationConfig(queueService, config),
    socialProviders: buildSocialProviders(config),
    session: {
      expiresIn: SESSION_EXPIRES_IN,
      updateAge: SESSION_UPDATE_AGE,
      cookieCache: { enabled: true, maxAge: SESSION_COOKIE_CACHE_MAX_AGE },
    },
    plugins: [
      buildOrganizationPlugin(onOrganizationCreated),
      // Better Auth admin plugin disabled in Phase 1 (#268)
      // All admin actions go through NestJS AdminModule with guards + audit logging.
      // The plugin exposed /api/auth/admin/* endpoints that bypassed NestJS guards entirely.
      buildMagicLinkPlugin(db, queueService, config),
    ],
  })
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>
