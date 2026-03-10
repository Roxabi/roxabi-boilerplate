import { defineEventHandler, proxyRequest } from 'h3'

// Runtime proxy for /api/** → API server.
//
// Kept as a Nitro server route (not a routeRules entry) so that
// VERCEL_AUTOMATION_BYPASS_SECRET is read from process.env at request time
// rather than serialised into the build artifact by Nitro's serializeRouteRule.
// The secret is also stored as a Vercel preview env var (not injected via
// --build-env in the workflow), so it never appears in build logs either.
//
// NOTE: do NOT use Nitro's devProxy as an alternative. devProxy uses http-proxy
// via h3's fromNodeHandler, which merges multiple Set-Cookie headers into a
// single comma-joined string — corrupting multi-cookie responses (e.g.
// better-auth's set-active-org sets both session and activeOrganizationId).
// proxyRequest() appends each Set-Cookie header separately and is correct.
export default defineEventHandler((event) => {
  const apiTarget = process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`
  const path = event.context.params?.path ?? ''

  // Only inject the bypass header in Vercel preview environments.
  // VERCEL_ENV is 'preview' for branch deployments, 'production' for prod, undefined locally.
  // Using === 'preview' ensures the secret is never forwarded locally or in production.
  const bypassSecret =
    process.env.VERCEL_ENV === 'preview' ? process.env.VERCEL_AUTOMATION_BYPASS_SECRET : undefined

  return proxyRequest(event, `${apiTarget}/api/${path}`, {
    ...(bypassSecret && {
      headers: { 'x-vercel-protection-bypass': bypassSecret },
    }),
  })
})
