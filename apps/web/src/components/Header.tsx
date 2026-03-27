import { Button } from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { BookOpen, Menu, X } from 'lucide-react'
import { Collapsible } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/lib/authClient'
import { clientEnv } from '@/lib/env.shared'
import { useOrganizations } from '@/lib/useOrganizations'
import { m } from '@/paraglide/messages'
import { GithubIcon } from './GithubIcon'
import { LocaleSwitcher } from './LocaleSwitcher'
import { Logo } from './Logo'
import { OrgSwitcher } from './OrgSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

function useMobileMenu(mobileRef: React.RefObject<HTMLDivElement | null>) {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }

    function handleClickOutside(e: MouseEvent) {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [mobileOpen, mobileRef])

  return { mobileOpen, setMobileOpen }
}

function DesktopNavLinks() {
  return (
    <div className="hidden items-center gap-1 md:flex">
      <Button variant="ghost" size="sm" asChild>
        <Link
          to="/"
          activeProps={{ className: 'bg-accent font-medium' }}
          activeOptions={{ exact: true }}
        >
          {m.nav_home()}
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/design-system" activeProps={{ className: 'bg-accent font-medium' }}>
          {m.nav_design_system()}
        </Link>
      </Button>
      {clientEnv.VITE_TALKS_URL && (
        <Button variant="ghost" size="sm" asChild>
          <a href={clientEnv.VITE_TALKS_URL} target="_blank" rel="noopener noreferrer">
            {m.nav_talks()}
          </a>
        </Button>
      )}
      {clientEnv.VITE_DOCS_URL && (
        <Button variant="ghost" size="sm" asChild>
          <a href={clientEnv.VITE_DOCS_URL} target="_blank" rel="noopener noreferrer">
            <BookOpen className="size-4" />
            {m.nav_docs()}
          </a>
        </Button>
      )}
    </div>
  )
}

function MobileNavPanel({
  mobileRef,
  session,
  onClose,
}: {
  mobileRef: React.RefObject<HTMLDivElement | null>
  session: unknown
  onClose: () => void
}) {
  return (
    <Collapsible.Content
      ref={mobileRef}
      className="overflow-hidden border-t border-border bg-background md:hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-2 data-[state=closed]:fade-out-0"
    >
      <div className="flex flex-col gap-2 px-6 py-4">
        <Button variant="ghost" size="sm" className="justify-start" asChild>
          <Link
            to="/"
            activeProps={{ className: 'bg-accent font-medium' }}
            activeOptions={{ exact: true }}
            onClick={onClose}
          >
            {m.nav_home()}
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="justify-start" asChild>
          <Link
            to="/design-system"
            activeProps={{ className: 'bg-accent font-medium' }}
            onClick={onClose}
          >
            {m.nav_design_system()}
          </Link>
        </Button>
        {clientEnv.VITE_TALKS_URL && (
          <Button variant="ghost" size="sm" className="justify-start" asChild>
            <a
              href={clientEnv.VITE_TALKS_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              {m.nav_talks()}
            </a>
          </Button>
        )}
        {clientEnv.VITE_DOCS_URL && (
          <Button variant="ghost" size="sm" className="justify-start" asChild>
            <a
              href={clientEnv.VITE_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              <BookOpen className="size-4" />
              {m.nav_docs()}
            </a>
          </Button>
        )}
        {!session && (
          <>
            <hr className="my-1 border-border" />
            <Button variant="ghost" size="sm" className="justify-start" asChild>
              <Link to="/login" onClick={onClose}>
                {m.nav_sign_in()}
              </Link>
            </Button>
            <Button size="sm" className="justify-start" asChild>
              <Link to="/register" onClick={onClose}>
                {m.nav_sign_up()}
              </Link>
            </Button>
          </>
        )}
      </div>
    </Collapsible.Content>
  )
}

export function Header() {
  const { data: session } = useSession()
  const orgState = useOrganizations(session?.user?.id)
  const authReady = session && orgState.data !== undefined
  const mobileRef = useRef<HTMLDivElement>(null)
  const { mobileOpen, setMobileOpen } = useMobileMenu(mobileRef)

  return (
    <Collapsible.Root open={mobileOpen} onOpenChange={setMobileOpen} asChild>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link
            to="/"
            className="text-foreground hover:opacity-80 transition-opacity"
            data-testid="brand-link"
          >
            <Logo />
          </Link>
          <DesktopNavLinks />
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
            <GithubIcon />
            {authReady ? (
              <div className="hidden items-center gap-1 md:flex">
                <OrgSwitcher orgState={orgState} />
                <UserMenu />
              </div>
            ) : !session ? (
              <div className="hidden items-center gap-1 md:flex">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">{m.nav_sign_in()}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">{m.nav_sign_up()}</Link>
                </Button>
              </div>
            ) : null}
            {authReady && (
              <div className="md:hidden">
                <UserMenu />
              </div>
            )}
            <Collapsible.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={mobileOpen ? m.menu_close() : m.menu_open()}
              >
                {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </Button>
            </Collapsible.Trigger>
          </div>
        </nav>
        <MobileNavPanel
          mobileRef={mobileRef}
          session={session}
          onClose={() => setMobileOpen(false)}
        />
      </header>
    </Collapsible.Root>
  )
}
