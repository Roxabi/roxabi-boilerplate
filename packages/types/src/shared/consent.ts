export interface ConsentCategories {
  necessary: true
  analytics: boolean
  marketing: boolean
}

export type ConsentAction = 'accepted' | 'rejected' | 'customized'

export interface ConsentCookiePayload {
  categories: ConsentCategories
  consentedAt: string | null
  policyVersion: string | null
  action: ConsentAction | null
}

export interface ConsentState extends ConsentCookiePayload {
  showBanner: boolean
}

export interface ConsentActions {
  acceptAll: () => void
  rejectAll: () => void
  saveCustom: (categories: ConsentCategories) => void
  openSettings: () => void
}

export interface ConsentRecord {
  id: string
  userId: string
  categories: ConsentCategories
  policyVersion: string
  action: ConsentAction
  createdAt: string
  updatedAt: string
}
