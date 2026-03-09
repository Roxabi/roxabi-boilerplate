import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { source } from '@/lib/source'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Roxabi Docs',
        children: (
          <a
            href={process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.roxabi.com'}
            className="text-fd-muted-foreground hover:text-fd-foreground ml-auto text-sm transition-colors"
          >
            &larr; App
          </a>
        ),
      }}
    >
      {children}
    </DocsLayout>
  )
}
