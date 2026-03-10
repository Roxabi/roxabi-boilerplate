import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { source } from '@/lib/source'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <a
            href={process.env.NEXT_PUBLIC_APP_URL ?? '/'}
            className="text-xs font-bold tracking-wider text-fd-muted-foreground/70 hover:text-fd-foreground uppercase transition-colors"
          >
            {process.env.NEXT_PUBLIC_APP_NAME ?? 'Docs'}
          </a>
        ),
      }}
    >
      {children}
    </DocsLayout>
  )
}
