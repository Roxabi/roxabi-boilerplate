import { cn, useReducedMotion } from '@repo/ui'
import { useId } from 'react'
import { BlobVariant } from './variants/BlobVariant'
import { PokemonVariant } from './variants/PokemonVariant'
import { RpgCanvasVariant } from './variants/RpgCanvasVariant'
import { SilhouetteVariant } from './variants/SilhouetteVariant'
import { TamagotchiVariant } from './variants/TamagotchiVariant'

export type LyraVariant =
  | 'quantum'
  | 'constellation'
  | 'rpg-canvas'
  | 'tamagotchi'
  | 'silhouette'
  | 'blob'
  | 'pokemon'

type LyraCompanionProps = {
  /** 0-16: evolution stage */
  stage: number
  /** Visual variant to render */
  variant: LyraVariant
  /** Size in px */
  size?: number
  className?: string
}

export function LyraCompanion({ stage, variant, size = 80, className }: LyraCompanionProps) {
  switch (variant) {
    case 'quantum':
      return <QuantumVariant stage={stage} size={size} className={className} />
    case 'constellation':
      return <ConstellationVariant stage={stage} size={size} className={className} />
    case 'rpg-canvas':
      return <RpgCanvasVariant stage={stage} size={size} className={className} />
    case 'tamagotchi':
      return <TamagotchiVariant stage={stage} size={size} className={className} />
    case 'silhouette':
      return <SilhouetteVariant stage={stage} size={size} className={className} />
    case 'blob':
      return <BlobVariant stage={stage} size={size} className={className} />
    case 'pokemon':
      return <PokemonVariant stage={stage} size={size} className={className} />
  }
}

// ─── Variant: Quantum Orbital Evolution ─────────────────────────────────────

function QuantumVariant({
  stage,
  size,
  className,
}: {
  stage: number
  size: number
  className?: string
}) {
  const uid = useId()
  const reducedMotion = useReducedMotion()
  const t = stage / 16

  const coreRadius = lerp(1, 6, Math.min(t * 2, 1))
  const coreOpacity = lerp(0.2, 1, Math.min(t * 1.5, 1))
  const glowRadius = lerp(0, 18, t)
  const glowOpacity = lerp(0, 0.3, t)
  const ringCount = Math.min(Math.floor(t * 5), 3)
  const electronCount = Math.min(Math.floor(t * 7), 5)
  const auraOpacity = t > 0.5 ? lerp(0, 0.15, (t - 0.5) * 2) : 0
  const showLetter = stage >= 9
  const letterOpacity = stage >= 9 ? lerp(0, 1, (stage - 9) / 7) : 0
  const isGlitching = stage === 2
  const isSerene = stage === 16
  const isPeak = stage === 14
  const satelliteCount = stage >= 11 ? Math.min(stage - 10, 6) : 0
  const animate = !reducedMotion

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn(
        'transition-all duration-1000',
        isGlitching && animate && 'lyra-glitch',
        className
      )}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`lc-glow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2D7FF9" stopOpacity={glowOpacity} />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
        <filter id={`lc-blur-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`lc-soft-${uid}`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {auraOpacity > 0 && (
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="0.5"
          opacity={auraOpacity}
          filter={`url(#lc-soft-${uid})`}
          className={cn(animate && isPeak && 'lyra-aura-peak')}
        />
      )}

      <circle
        cx="50"
        cy="50"
        r={glowRadius}
        fill={`url(#lc-glow-${uid})`}
        className="transition-all duration-1000"
      />

      {ringCount >= 1 && (
        <ellipse
          cx="50"
          cy="50"
          rx={lerp(20, 35, t)}
          ry={lerp(8, 12, t)}
          fill="none"
          stroke="#2D7FF9"
          strokeWidth={lerp(0.3, 0.8, t)}
          opacity={lerp(0.2, 0.6, t)}
          transform="rotate(-35, 50, 50)"
          className={cn(animate && 'lyra-ring1')}
          style={{ transformOrigin: '50px 50px' }}
        />
      )}
      {ringCount >= 2 && (
        <ellipse
          cx="50"
          cy="50"
          rx={lerp(20, 35, t)}
          ry={lerp(8, 12, t)}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth={lerp(0.3, 0.6, t)}
          opacity={lerp(0.2, 0.5, t)}
          transform="rotate(55, 50, 50)"
          className={cn(animate && 'lyra-ring2')}
          style={{ transformOrigin: '50px 50px' }}
        />
      )}
      {ringCount >= 3 && (
        <ellipse
          cx="50"
          cy="50"
          rx={lerp(20, 35, t)}
          ry={lerp(6, 10, t)}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="0.4"
          opacity="0.2"
          className={cn(animate && 'lyra-ring3')}
          style={{ transformOrigin: '50px 50px' }}
        />
      )}

      {Array.from({ length: electronCount }).map((_, i) => {
        const angle = (i * 360) / electronCount
        const orbitR = lerp(18, 32, t)
        const ex = 50 + orbitR * Math.cos((angle * Math.PI) / 180)
        const ey = 50 + orbitR * Math.sin((angle * Math.PI) / 180) * 0.4
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static electron positions
          <circle
            key={i}
            cx={ex}
            cy={ey}
            r={lerp(1, 2.5, t)}
            fill={i % 2 === 0 ? '#2D7FF9' : '#8B5CF6'}
            opacity={lerp(0.3, 0.8, t)}
            filter={`url(#lc-blur-${uid})`}
            className={cn(animate && `lyra-electron-${(i % 3) + 1}`)}
            style={{ transformOrigin: '50px 50px' }}
          />
        )
      })}

      {Array.from({ length: satelliteCount }).map((_, i) => {
        const angle = i * 60 + 30
        const sx = 50 + 40 * Math.cos((angle * Math.PI) / 180)
        const sy = 50 + 40 * Math.sin((angle * Math.PI) / 180)
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static satellite positions
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r="1.5"
            fill={i % 2 === 0 ? '#2D7FF9' : '#8B5CF6'}
            opacity="0.5"
            className={cn(animate && 'lyra-satellite')}
          />
        )
      })}

      <circle
        cx="50"
        cy="50"
        r={coreRadius * 2}
        fill="#2D7FF9"
        opacity={coreOpacity * 0.15}
        filter={`url(#lc-soft-${uid})`}
        className={cn('transition-all duration-1000', animate && !isSerene && 'lyra-core-pulse')}
      />
      <circle
        cx="50"
        cy="50"
        r={coreRadius}
        fill="white"
        opacity={coreOpacity}
        filter={`url(#lc-blur-${uid})`}
        className="transition-all duration-1000"
      />
      <circle
        cx="50"
        cy="50"
        r={coreRadius * 0.5}
        fill="#8B5CF6"
        opacity={coreOpacity}
        className="transition-all duration-1000"
      />

      {showLetter && (
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={lerp(8, 14, (stage - 9) / 7)}
          fontWeight="bold"
          className="transition-all duration-1000"
          opacity={letterOpacity}
          style={{ fill: '#e0e0ff', filter: `url(#lc-blur-${uid})` }}
        >
          L
        </text>
      )}

      {stage >= 13 && (
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          rx="4"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="0.5"
          strokeDasharray={stage >= 14 ? 'none' : '4 4'}
          opacity={lerp(0.2, 0.5, (stage - 13) / 3)}
          className="transition-all duration-1000"
        />
      )}

      {stage >= 7 && (
        <path
          d={`M 20 75 Q 30 ${70 - t * 5} 40 75 Q 50 ${80 + t * 5} 60 75 Q 70 ${70 - t * 5} 80 75`}
          fill="none"
          stroke="#2D7FF9"
          strokeWidth="0.8"
          opacity={lerp(0, 0.5, (stage - 7) / 9)}
          className={cn(animate && 'lyra-wave')}
        />
      )}
    </svg>
  )
}

// ─── Variant: Constellation ─────────────────────────────────────────────────

function ConstellationVariant({
  stage,
  size,
  className,
}: {
  stage: number
  size: number
  className?: string
}) {
  const uid = useId()
  const reducedMotion = useReducedMotion()
  const t = stage / 16
  const animate = !reducedMotion

  const starCount = Math.min(Math.floor(t * 12) + 1, 12)
  const lineCount = Math.max(0, Math.min(Math.floor(t * 10) - 1, 10))

  const stars = [
    { x: 50, y: 20 },
    { x: 35, y: 40 },
    { x: 65, y: 40 },
    { x: 30, y: 55 },
    { x: 70, y: 55 },
    { x: 35, y: 70 },
    { x: 65, y: 70 },
    { x: 50, y: 50 },
    { x: 20, y: 30 },
    { x: 80, y: 30 },
    { x: 45, y: 85 },
    { x: 55, y: 85 },
  ]

  const lines: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [5, 6],
    [1, 7],
    [2, 7],
    [0, 7],
  ]

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('transition-all duration-1000', className)}
      aria-hidden="true"
    >
      <defs>
        <filter id={`lc-star-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {lines.slice(0, lineCount).map(([a, b], i) => {
        const from = stars[a]!
        const to = stars[b]!
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static constellation lines
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#2D7FF9"
            strokeWidth={lerp(0.3, 0.8, t)}
            opacity={lerp(0.1, 0.4, t)}
            className="transition-all duration-1000"
          />
        )
      })}

      {stars.slice(0, starCount).map((star, i) => {
        const isVega = i === 0
        const r = isVega ? lerp(1.5, 4, t) : lerp(0.5, 2, t)
        const fill = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#2D7FF9' : '#8B5CF6'
        return (
          <g key={`${star.x}-${star.y}`}>
            <circle
              cx={star.x}
              cy={star.y}
              r={r * 3}
              fill={fill}
              opacity={lerp(0.03, isVega ? 0.15 : 0.08, t)}
              filter={`url(#lc-star-${uid})`}
            />
            <circle
              cx={star.x}
              cy={star.y}
              r={r}
              fill={fill}
              opacity={lerp(0.3, 1, t)}
              className={cn(
                'transition-all duration-1000',
                animate && isVega && stage >= 8 && 'lyra-star-pulse'
              )}
            />
          </g>
        )
      })}

      {stage >= 9 && (
        <text
          x="50"
          y="96"
          textAnchor="middle"
          fontSize="6"
          fontFamily="monospace"
          letterSpacing="3"
          fill="#8B5CF6"
          opacity={lerp(0, 0.6, (stage - 9) / 7)}
          className="transition-all duration-1000"
        >
          LYRA
        </text>
      )}
    </svg>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}
