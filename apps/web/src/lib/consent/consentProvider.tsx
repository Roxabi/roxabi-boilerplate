import type {
  ConsentAction,
  ConsentActions,
  ConsentCategories,
  ConsentCookiePayload,
  ConsentState,
} from '@repo/types'
import {
  cloneElement,
  createContext,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { legalConfig } from '@/config/legal.config'
import { useSession } from '@/lib/authClient'
import { parseConsentCookie } from '@/lib/consent/parse'

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000
const SIX_MONTHS_SECONDS = 15778800

export type ConsentContextValue = ConsentState & ConsentActions

export const ConsentContext = createContext<ConsentContextValue | null>(null)

export type ConsentBannerProps = {
  onAcceptAll: () => void
  onRejectAll: () => void
  onOpenSettings: () => void
  showBanner: boolean
}

export type ConsentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: ConsentCategories
  onSave: (categories: ConsentCategories) => void
}

type ConsentProviderProps = {
  children: ReactNode
  initialConsent: ConsentCookiePayload | null
  banner: ReactElement<any>
  modal: ReactElement<any>
}

function readCookieClient(): ConsentCookiePayload | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)consent=([^;]*)/)
  return match ? parseConsentCookie(match[1]) : null
}

function computeShowBanner(consent: ConsentCookiePayload | null): boolean {
  if (!(consent?.consentedAt && consent.action)) return true

  const consentAge = Date.now() - new Date(consent.consentedAt).getTime()
  if (consentAge > SIX_MONTHS_MS) return true

  if (consent.policyVersion !== legalConfig.consentPolicyVersion) return true

  return false
}

function writeCookie(payload: ConsentCookiePayload): void {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const value = encodeURIComponent(JSON.stringify(payload))
  let cookie = `consent=${value}; Path=/; SameSite=Lax; Max-Age=${SIX_MONTHS_SECONDS}`
  if (isSecure) {
    cookie += '; Secure'
  }
  // biome-ignore lint/suspicious/noDocumentCookie: Required for consent cookie management
  document.cookie = cookie
}

function buildPayload(categories: ConsentCategories, action: ConsentAction): ConsentCookiePayload {
  return {
    categories,
    consentedAt: new Date().toISOString(),
    policyVersion: legalConfig.consentPolicyVersion,
    action,
  }
}

async function syncToServer(payload: ConsentCookiePayload): Promise<void> {
  try {
    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        categories: payload.categories,
        policyVersion: payload.policyVersion,
        action: payload.action,
      }),
    })
  } catch {
    // Consent sync failure is non-critical
  }
}

function getInitialConsent(
  serverConsent: ConsentCookiePayload | null
): ConsentCookiePayload | null {
  // Use server-provided value if available, otherwise read from client cookie
  if (serverConsent) return serverConsent
  return readCookieClient()
}

function useDbReconciliation(
  userId: string | undefined,
  setConsent: (c: ConsentCookiePayload) => void,
  setShowBanner: (s: boolean) => void
) {
  useEffect(() => {
    if (!userId) return

    async function reconcile() {
      try {
        const res = await fetch('/api/consent', { credentials: 'include' })
        if (res.status === 404 || !res.ok) return

        const dbRecord = (await res.json()) as {
          categories: ConsentCategories
          policyVersion: string
          action: ConsentAction
          createdAt: string
        }

        const dbPayload: ConsentCookiePayload = {
          categories: dbRecord.categories,
          consentedAt: dbRecord.createdAt,
          policyVersion: dbRecord.policyVersion,
          action: dbRecord.action,
        }

        writeCookie(dbPayload)
        setConsent(dbPayload)
        setShowBanner(computeShowBanner(dbPayload))
      } catch {
        // Reconciliation failure is non-critical
      }
    }

    reconcile()
  }, [userId, setConsent, setShowBanner])
}

function createConsentActions(
  setConsent: (c: ConsentCookiePayload | null) => void,
  setShowBanner: (s: boolean) => void,
  setModalOpen: (o: boolean) => void
) {
  function saveConsent(categories: ConsentCategories, action: ConsentAction) {
    const payload = buildPayload(categories, action)
    writeCookie(payload)
    setConsent(payload)
    setShowBanner(false)
    setModalOpen(false)
    syncToServer(payload)
  }

  return {
    acceptAll: () => saveConsent({ necessary: true, analytics: true, marketing: true }, 'accepted'),
    rejectAll: () =>
      saveConsent({ necessary: true, analytics: false, marketing: false }, 'rejected'),
    saveCustom: (categories: ConsentCategories) => saveConsent(categories, 'customized'),
    openSettings: () => setModalOpen(true),
  }
}

export function ConsentProvider({
  children,
  initialConsent: serverConsent,
  banner,
  modal,
}: ConsentProviderProps) {
  const resolved = getInitialConsent(serverConsent)
  const showBannerInitial = computeShowBanner(resolved)

  const [consent, setConsent] = useState<ConsentCookiePayload | null>(resolved)
  const [showBanner, setShowBanner] = useState(showBannerInitial)
  const [modalOpen, setModalOpen] = useState(false)
  const session = useSession()

  // Client-side: read cookie on mount if no server consent was provided
  useEffect(() => {
    if (serverConsent) return
    const clientConsent = readCookieClient()
    if (clientConsent) {
      setConsent(clientConsent)
      setShowBanner(computeShowBanner(clientConsent))
    }
  }, [serverConsent])

  useDbReconciliation(session.data?.user?.id, setConsent, setShowBanner)

  // biome-ignore lint/correctness/useExhaustiveDependencies: useState setters are stable — listed explicitly to make the contract clear per code review
  const { acceptAll, rejectAll, saveCustom, openSettings } = useMemo(
    () => createConsentActions(setConsent, setShowBanner, setModalOpen),
    [setConsent, setShowBanner, setModalOpen]
  )

  const value: ConsentContextValue = {
    categories: consent?.categories ?? { necessary: true, analytics: false, marketing: false },
    consentedAt: consent?.consentedAt ?? null,
    policyVersion: consent?.policyVersion ?? null,
    action: consent?.action ?? null,
    showBanner,
    acceptAll,
    rejectAll,
    saveCustom,
    openSettings,
  }

  const bannerElement = useMemo(
    () =>
      // biome-ignore lint/suspicious/noExplicitAny: React.cloneElement is inherently typed loosely
      cloneElement(banner as any, {
        onAcceptAll: acceptAll,
        onRejectAll: rejectAll,
        onOpenSettings: openSettings,
        showBanner,
      }),
    [banner, acceptAll, rejectAll, openSettings, showBanner]
  )

  const modalElement = useMemo(
    () =>
      // biome-ignore lint/suspicious/noExplicitAny: React.cloneElement is inherently typed loosely
      cloneElement(modal as any, {
        open: modalOpen,
        onOpenChange: setModalOpen,
        categories: value.categories,
        onSave: saveCustom,
      }),
    [modal, modalOpen, value.categories, saveCustom]
  )

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {bannerElement}
      {modalElement}
    </ConsentContext.Provider>
  )
}
