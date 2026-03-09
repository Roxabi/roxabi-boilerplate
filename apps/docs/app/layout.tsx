import { RootProvider } from 'fumadocs-ui/provider'
import type { ReactNode } from 'react'
import '../globals.css'

const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL
const appUrl =
  rawAppUrl?.startsWith('https://') || rawAppUrl?.startsWith('http://') ? rawAppUrl : undefined

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>
          {appUrl && (
            <div className="flex h-9 items-center border-b px-4 text-xs text-muted-foreground">
              <a href={appUrl} className="hover:text-foreground transition-colors">
                &larr; Back to app
              </a>
            </div>
          )}
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
