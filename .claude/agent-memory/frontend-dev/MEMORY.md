# Frontend Dev Memory

## Terminal Dark / Hacker Aesthetic (v10 pattern)

- Inject CSS via `const STYLES = \`...\`` rendered as `<style>{STYLES}</style>` inside root component
- Namespace all CSS classes with version prefix (e.g., `v10-`) to avoid global collisions
- Fonts: JetBrains Mono (headlines/code) + IBM Plex Sans (body) — loaded via `@import url(...)` inside STYLES
- Colors: bg `#0F172A`→`#020617`, green `#22C55E`, cyan `#06B6D4`, muted `#64748B`
- Terminal panel: `background: #020617`, `border: 1px solid #1e293b`, CRT scanline via `::before` repeating-linear-gradient
- Blinking cursor: `animation: blink 1.1s step-end infinite` — step-end is required for digital feel
- Scanline sweep: positioned `::after` pseudo-element animating `translateY` on scanline-overlay class
- Scrolling ticker: duplicate array `[...arr, ...arr]` + `translateX(-50%)` animation
- Always add `@media (prefers-reduced-motion: reduce)` to disable all animations

## Landing Page Conventions (v11 pattern)

- Self-contained route files go in `apps/web/src/routes/` — no imports from `@/components/landing/`
- All data arrays defined as `const ... = [...] as const` at module top — keeps component functions clean
- Props types: `type XxxProps = { ... }` with `Props` suffix, placed immediately before the function
- `noUncheckedIndexedAccess` + `TS6133`: always remove unused imports before finishing (e.g., unused lucide icons cause TS6133 error)
- Tailwind v4 arbitrary values work fine: `bg-[#ECFEFF]`, `text-[#164E63]/70`, `tracking-[0.2em]`
- No `cn()` needed when classNames are static strings — only import from `@repo/ui` when conditionally composing classes
- `as const` on `readonly string[]` feature arrays: the `PricingCardProps.features` type should be `readonly string[]` to accept `as const` tuples passed from the data array

## TypeScript Gotchas

- `noUncheckedIndexedAccess`: array[i] returns T | undefined — use `?? fallback`
- `TS6133`: unused imports/destructured params are errors — remove before submitting
- `as const` arrays passed to props typed `string[]` cause type errors — type props as `readonly string[]`

## CSS Injection Pattern (v13 glassmorphism)

- Inject CSS as `<style>{GLOBAL_STYLES}</style>` — avoids the security hook that fires on dangerouslySetInnerHTML, works equally well for compile-time string constants
- Glassmorphism: `backdrop-filter: blur(20px)` requires both `-webkit-backdrop-filter` and `backdrop-filter` for cross-browser support
- Gradient orbs: `position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0` — parent must be `overflow-hidden` and `relative`
- Glass card: `background: rgba(255,255,255,0.60)` + `border: 1px solid rgba(255,255,255,0.4)` + `box-shadow: inset 0 1px 0 rgba(255,255,255,0.8)` — the inset top highlight is the key premium effect
