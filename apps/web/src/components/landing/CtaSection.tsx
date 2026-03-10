import { Button } from '@repo/ui'
import { SectionHeading } from '@/components/landing/SectionHeading'
import { clientEnv } from '@/lib/env.shared'
import { m } from '@/paraglide/messages'

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-border py-24">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-muted/50 to-chart-1/5 dark:from-primary/10 dark:via-muted/30 dark:to-chart-1/10" />

      <div className="relative mx-auto max-w-7xl px-6 text-center">
        <SectionHeading title={m.cta_title()} subtitle={m.cta_subtitle()} />
        <div className="mt-8">
          {clientEnv.VITE_DOCS_URL && (
            <Button size="lg" asChild>
              <a href={clientEnv.VITE_DOCS_URL} target="_blank" rel="noopener noreferrer">
                {m.cta_button()}
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
