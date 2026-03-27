import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { source } from '@/lib/source'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <span className="text-xs font-bold tracking-wider text-fd-muted-foreground/70 hover:text-fd-foreground uppercase transition-colors">
            {process.env.NEXT_PUBLIC_APP_NAME ?? 'Docs'}
          </span>
        ),
        url: process.env.NEXT_PUBLIC_APP_URL ?? '/',
      }}
    >
      {children}
    </DocsLayout>
  )
}
