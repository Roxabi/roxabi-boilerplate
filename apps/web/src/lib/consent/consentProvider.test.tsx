import type { ConsentCookiePayload } from '@repo/types'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock auth-client to control useSession
const mockUseSession = vi.fn()
vi.mock('@/lib/authClient', () => ({
  useSession: () => mockUseSession(),
}))

// Mock @repo/ui with shared mocks + Switch + Separator
vi.mock('@repo/ui', async () => {
  const mocks = await import('@/test/__mocks__/repoUi')
  return {
    ...mocks,
    Separator: () => <hr />,
    Switch: ({
      checked,
      disabled,
      onCheckedChange,
      ...props
    }: {
      checked?: boolean
      disabled?: boolean
      onCheckedChange?: (v: boolean) => void
      [key: string]: unknown
    }) => (
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
    ),
  }
})

// Must import after vi.mock
import { ConsentProvider } from './consentProvider'
import { useConsent } from './useConsent'

function ConsentTestConsumer() {
  const ctx = useConsent()
  return (
    <div>
      <span data-testid="show-banner">{String(ctx.showBanner)}</span>
      <span data-testid="action">{ctx.action ?? 'null'}</span>
      <span data-testid="analytics">{String(ctx.categories.analytics)}</span>
      <span data-testid="marketing">{String(ctx.categories.marketing)}</span>
      <span data-testid="policy-version">{ctx.policyVersion ?? 'null'}</span>
      <button type="button" onClick={ctx.acceptAll}>
        Accept All
      </button>
      <button type="button" onClick={ctx.rejectAll}>
        Reject All
      </button>
      <button
        type="button"
        onClick={() => ctx.saveCustom({ necessary: true, analytics: true, marketing: false })}
      >
        Save Custom
      </button>
      <button type="button" onClick={ctx.openSettings}>
        Open Settings
      </button>
    </div>
  )
}

function DummyBanner() {
  return <div data-testid="consent-banner">Banner</div>
}

function DummyModal() {
  return <div data-testid="consent-modal">Modal</div>
}

function renderWithProvider(initialConsent: ConsentCookiePayload | null) {
  return render(
    <ConsentProvider
      initialConsent={initialConsent}
      banner={<DummyBanner />}
      modal={<DummyModal />}
    >
      <ConsentTestConsumer />
    </ConsentProvider>
  )
}

describe('ConsentProvider / useConsent', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Default: unauthenticated user
    mockUseSession.mockReturnValue({ data: null })
    // Reset cookie
    // biome-ignore lint/suspicious/noDocumentCookie: Required for consent cookie management
    document.cookie = 'consent=; Max-Age=0'
    // Mock fetch globally
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
  })

  describe('showBanner', () => {
    it('should be true when no consent exists', () => {
      // Arrange & Act
      renderWithProvider(null)

      // Assert
      expect(screen.getByTestId('show-banner')).toHaveTextContent('true')
    })

    it('should be true when consent is older than 6 months', () => {
      // Arrange — consent from 7 months ago
      const sevenMonthsAgo = new Date()
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7)

      const oldConsent: ConsentCookiePayload = {
        categories: { necessary: true, analytics: true, marketing: true },
        consentedAt: sevenMonthsAgo.toISOString(),
        policyVersion: '2026-02-v1',
        action: 'accepted',
      }

      // Act
      renderWithProvider(oldConsent)

      // Assert
      expect(screen.getByTestId('show-banner')).toHaveTextContent('true')
    })

    it('should be true when policyVersion is outdated', () => {
      // Arrange — consent with old policy version
      const outdatedConsent: ConsentCookiePayload = {
        categories: { necessary: true, analytics: true, marketing: true },
        consentedAt: new Date().toISOString(),
        policyVersion: '2025-01-v1', // Outdated vs current '2026-02-v1'
        action: 'accepted',
      }

      // Act
      renderWithProvider(outdatedConsent)

      // Assert
      expect(screen.getByTestId('show-banner')).toHaveTextContent('true')
    })

    it('should be false when valid consent exists', () => {
      // Arrange — fresh consent with current policy version
      const validConsent: ConsentCookiePayload = {
        categories: { necessary: true, analytics: true, marketing: true },
        consentedAt: new Date().toISOString(),
        policyVersion: '2026-02-v1',
        action: 'accepted',
      }

      // Act
      renderWithProvider(validConsent)

      // Assert
      expect(screen.getByTestId('show-banner')).toHaveTextContent('false')
    })
  })

  describe('consent actions', () => {
    it('should set all categories to true and action to accepted on acceptAll', () => {
      // Arrange
      renderWithProvider(null)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Accept All' }))

      // Assert
      expect(screen.getByTestId('analytics')).toHaveTextContent('true')
      expect(screen.getByTestId('marketing')).toHaveTextContent('true')
      expect(screen.getByTestId('action')).toHaveTextContent('accepted')
      expect(screen.getByTestId('show-banner')).toHaveTextContent('false')
    })

    it('should set analytics and marketing to false and action to rejected on rejectAll', () => {
      // Arrange
      renderWithProvider(null)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Reject All' }))

      // Assert
      expect(screen.getByTestId('analytics')).toHaveTextContent('false')
      expect(screen.getByTestId('marketing')).toHaveTextContent('false')
      expect(screen.getByTestId('action')).toHaveTextContent('rejected')
      expect(screen.getByTestId('show-banner')).toHaveTextContent('false')
    })

    it('should save given categories with action customized on saveCustom', () => {
      // Arrange
      renderWithProvider(null)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Save Custom' }))

      // Assert
      expect(screen.getByTestId('analytics')).toHaveTextContent('true')
      expect(screen.getByTestId('marketing')).toHaveTextContent('false')
      expect(screen.getByTestId('action')).toHaveTextContent('customized')
      expect(screen.getByTestId('show-banner')).toHaveTextContent('false')
    })
  })

  describe('useConsent outside provider', () => {
    it('should throw when used outside ConsentProvider', () => {
      // Arrange & Act & Assert
      expect(() => {
        render(<ConsentTestConsumer />)
      }).toThrow('useConsent must be used within a ConsentProvider')
    })
  })

  describe('server sync (POST /api/consent)', () => {
    type FetchCall = [url: string, options: { method: string; credentials: string; body: string }]

    it('should call POST /api/consent with all categories true and action accepted after acceptAll', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', mockFetch)
      renderWithProvider(null)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Accept All' }))

      // Assert
      await waitFor(() => {
        const postCalls = (mockFetch.mock.calls as FetchCall[]).filter(
          (call) => call[1]?.method === 'POST'
        )
        expect(postCalls.length).toBeGreaterThanOrEqual(1)

        const firstCall = postCalls[0]
        if (!firstCall) throw new Error('Expected at least one POST call')
        const [url, options] = firstCall
        expect(url).toBe('/api/consent')
        expect(options.credentials).toBe('include')

        const body = JSON.parse(options.body)
        expect(body.categories).toEqual({
          necessary: true,
          analytics: true,
          marketing: true,
        })
        expect(body.action).toBe('accepted')
        expect(body.policyVersion).toBe('2026-02-v1')
      })
    })

    it('should call POST /api/consent with analytics/marketing false and action rejected after rejectAll', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', mockFetch)
      renderWithProvider(null)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Reject All' }))

      // Assert
      await waitFor(() => {
        const postCalls = (mockFetch.mock.calls as FetchCall[]).filter(
          (call) => call[1]?.method === 'POST'
        )
        expect(postCalls.length).toBeGreaterThanOrEqual(1)

        const firstCall = postCalls[0]
        if (!firstCall) throw new Error('Expected at least one POST call')
        const [url, options] = firstCall
        expect(url).toBe('/api/consent')
        expect(options.credentials).toBe('include')

        const body = JSON.parse(options.body)
        expect(body.categories.analytics).toBe(false)
        expect(body.categories.marketing).toBe(false)
        expect(body.action).toBe('rejected')
      })
    })

    it('should call POST /api/consent with custom categories and action customized after saveCustom', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', mockFetch)
      renderWithProvider(null)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Save Custom' }))

      // Assert
      await waitFor(() => {
        const postCalls = (mockFetch.mock.calls as FetchCall[]).filter(
          (call) => call[1]?.method === 'POST'
        )
        expect(postCalls.length).toBeGreaterThanOrEqual(1)

        const firstCall = postCalls[0]
        if (!firstCall) throw new Error('Expected at least one POST call')
        const [url, options] = firstCall
        expect(url).toBe('/api/consent')
        expect(options.credentials).toBe('include')

        const body = JSON.parse(options.body)
        expect(body.categories).toEqual({
          necessary: true,
          analytics: true,
          marketing: false,
        })
        expect(body.action).toBe('customized')
      })
    })
  })

  describe('DB reconciliation', () => {
    it('should update state to match DB record when authenticated user has a different DB consent', async () => {
      // Arrange — authenticated session
      mockUseSession.mockReturnValue({ data: { user: { id: 'user-1' } } })

      // DB consent record differs from cookie consent
      const dbConsent = {
        categories: { necessary: true, analytics: true, marketing: true },
        policyVersion: '2026-02-v1',
        action: 'accepted',
        createdAt: new Date().toISOString(),
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(dbConsent),
      })
      vi.stubGlobal('fetch', mockFetch)

      // Initial cookie consent has analytics/marketing false
      const cookieConsent: ConsentCookiePayload = {
        categories: { necessary: true, analytics: false, marketing: false },
        consentedAt: new Date().toISOString(),
        policyVersion: '2026-02-v1',
        action: 'rejected',
      }

      // Act
      renderWithProvider(cookieConsent)

      // Assert — DB record wins: analytics and marketing should become true
      await waitFor(() => {
        expect(screen.getByTestId('analytics')).toHaveTextContent('true')
        expect(screen.getByTestId('marketing')).toHaveTextContent('true')
        expect(screen.getByTestId('action')).toHaveTextContent('accepted')
      })
    })
  })
})
