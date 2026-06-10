/**
 * CUSTOMIZE BEFORE DEPLOYMENT
 *
 * Replace all values below with your company's actual legal information.
 * These values are used in the Mentions Légales, CGU, Privacy Policy,
 * and Cookie Policy pages. Failure to customize may result in legal
 * non-compliance under French law (LCEN).
 */
export const legalConfig = {
  companyName: 'ACME Corp SAS',
  legalForm: 'SAS',
  shareCapital: '10 000 \u20ac',
  registeredAddress: '1 rue de la Paix, 75001 Paris, France',
  rcsNumber: 'Paris B 123 456 789',
  siretNumber: '123 456 789 00001',
  vatNumber: 'FR 12 123456789',
  publicationDirector: 'Jean Dupont',
  gdprContactEmail: 'privacy@example.com',
  host: {
    name: 'Vercel Inc.',
    address: '440 N Barranca Ave #4133, Covina, CA 91723, USA',
    phone: '+1 (559) 288-7060',
  },
  consentPolicyVersion: '2026-02-v1',
} as const

if (import.meta.env.PROD && legalConfig.companyName === 'ACME Corp SAS') {
  // Warn, don't throw: the boilerplate itself ships (CI e2e, preview, demo)
  // with placeholder values — a module-load throw would take the whole SSR
  // down. Products built from this template replace these before launch.
  console.warn(
    'legal.config.ts contains placeholder values. ' +
      "Replace with your company's actual legal information before going to production."
  )
}
