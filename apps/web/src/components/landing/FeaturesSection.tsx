import { cn } from '@repo/ui'
import {
  Bot,
  Building2,
  FileCheck2,
  FolderTree,
  Globe,
  KeyRound,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import type * as React from 'react'
import { FeatureCard } from '@/components/FeatureCard'
import { SectionHeading } from '@/components/landing/SectionHeading'
import { clientEnv } from '@/lib/env.shared'
import { m } from '@/paraglide/messages'

type Feature = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href?: string
}

export function FeaturesSection() {
  const docsBase = clientEnv.VITE_DOCS_URL ?? null

  const features: Feature[] = [
    {
      icon: Layers,
      title: m.feature_fullstack_title(),
      description: m.feature_fullstack_desc(),
      href: '/docs/architecture/overview',
    },
    {
      icon: ShieldCheck,
      title: m.feature_auth_title(),
      description: m.feature_auth_desc(),
      href: '/docs/guides/authentication',
    },
    {
      icon: Building2,
      title: m.feature_multitenant_title(),
      description: m.feature_multitenant_desc(),
    },
    { icon: KeyRound, title: m.feature_rbac_title(), description: m.feature_rbac_desc() },
    { icon: FileCheck2, title: m.feature_typesafe_title(), description: m.feature_typesafe_desc() },
    { icon: FolderTree, title: m.feature_monorepo_title(), description: m.feature_monorepo_desc() },
    {
      icon: Globe,
      title: m.feature_i18n_title(),
      description: m.feature_i18n_desc(),
      href: '/docs/configuration',
    },
    { icon: Bot, title: m.feature_ai_title(), description: m.feature_ai_desc() },
  ]

  return (
    <section className="border-t border-border bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading title={m.features_title()} subtitle={m.features_subtitle()} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const card = (
              <FeatureCard
                key={feature.title}
                icon={<feature.icon className="mb-2 size-8 text-primary" />}
                title={feature.title}
                description={feature.description}
                className={cn(feature.href && docsBase && 'cursor-pointer hover:border-primary/50')}
              />
            )

            if (feature.href && docsBase) {
              return (
                <a
                  key={feature.title}
                  href={`${docsBase}${feature.href}`}
                  className="h-full"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {card}
                </a>
              )
            }

            return card
          })}
        </div>
      </div>
    </section>
  )
}
