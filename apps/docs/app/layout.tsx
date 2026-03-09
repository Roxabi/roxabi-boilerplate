import { RootProvider } from 'fumadocs-ui/provider'
import type { ReactNode } from 'react'
import 'fumadocs-ui/style.css'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
