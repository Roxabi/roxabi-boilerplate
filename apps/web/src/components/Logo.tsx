import { cn } from '@repo/ui'
import { clientEnv } from '@/lib/env.shared'

type LogoProps = {
  size?: 'sm' | 'default' | 'lg'
  showText?: boolean
}

const appName = clientEnv.VITE_APP_NAME ?? 'App'
const appInitial = appName.charAt(0).toUpperCase()

const sizes = { sm: 'size-6', default: 'size-8', lg: 'size-10' } as const
const textSizes = { sm: 'text-lg', default: 'text-xl', lg: 'text-2xl' } as const

export function Logo({ size = 'default', showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <svg
        viewBox="0 0 32 32"
        className={cn(sizes[size], 'text-primary')}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M16 2L28.124 9V23L16 30L3.876 23V9L16 2Z" fill="currentColor" opacity="0.15" />
        <path d="M16 2L28.124 9V23L16 30L3.876 23V9L16 2Z" stroke="currentColor" strokeWidth="2" />
        <text x="16" y="20" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="bold">
          {appInitial}
        </text>
      </svg>
      {showText && (
        <span className={cn('font-bold tracking-tight', textSizes[size])}>{appName}</span>
      )}
    </div>
  )
}
