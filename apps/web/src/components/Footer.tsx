import { Link } from '@tanstack/react-router'
import { GITHUB_REPO_URL } from '@/lib/config'
import { useConsent } from '@/lib/consent/useConsent'
import { m } from '@/paraglide/messages'

const CURRENT_YEAR = new Date().getFullYear().toString()

export function Footer() {
  const { openSettings } = useConsent()

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: copyright + product links */}
        <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span>{m.footer_copyright({ year: CURRENT_YEAR })}</span>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {m.github_label()}
          </a>
        </div>

        {/* Right: legal links */}
        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground"
        >
          <Link to="/legal/mentions-legales" className="hover:text-foreground transition-colors">
            {m.footer_legal_notice()}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/legal/cgu" className="hover:text-foreground transition-colors">
            {m.footer_terms()}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/legal/confidentialite" className="hover:text-foreground transition-colors">
            {m.footer_privacy()}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/legal/cookies" className="hover:text-foreground transition-colors">
            {m.footer_cookies()}
          </Link>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={openSettings}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {m.footer_cookie_settings()}
          </button>
        </nav>
      </div>
    </footer>
  )
}
