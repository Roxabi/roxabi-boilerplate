import { cn, useReducedMotion } from '@repo/ui'
import { useId } from 'react'

type SilhouetteVariantProps = {
  stage: number
  size: number
  className?: string
}

// A dark humanoid silhouette that progressively reveals colors, features, details
export function SilhouetteVariant({ stage, size, className }: SilhouetteVariantProps) {
  const uid = useId()
  const reducedMotion = useReducedMotion()
  const animate = !reducedMotion
  const t = stage / 16

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      className={cn('transition-all duration-1000', className)}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`sil-glow-${uid}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity={lerp(0.2, 0.6, t)} />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
        <filter id={`sil-blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={`sil-clip-${uid}`}>
          <path d={SILHOUETTE_PATH} />
        </clipPath>
        {/* Reveal mask — circle expanding from center */}
        <radialGradient id={`sil-reveal-${uid}`} cx="50%" cy="35%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset={`${lerp(0, 100, t)}%`} stopColor="white" stopOpacity="1" />
          <stop offset={`${lerp(5, 100, t)}%`} stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow */}
      <circle
        cx="50"
        cy="48"
        r={lerp(22, 56, t)}
        fill={`url(#sil-glow-${uid})`}
        className="transition-all duration-1000"
      />

      {/* Stage 0: Nothing */}
      {stage === 0 && <circle cx="50" cy="50" r="1" fill="#2D7FF9" opacity="0.3" />}

      {/* Stage 1+: Silhouette appears */}
      {stage >= 1 && (
        <g>
          {/* Dark silhouette base — always visible */}
          <path
            d={SILHOUETTE_PATH}
            fill="#1e0a4e"
            stroke={stage >= 1 ? '#8B5CF6' : 'none'}
            strokeWidth={lerp(0.4, 1, stage / 16)}
            opacity={lerp(0.65, 1, Math.min(t * 2, 1))}
            className="transition-all duration-1000"
          />

          {/* Color reveal layer — clipped to silhouette, masked by reveal gradient */}
          {stage >= 4 && (
            <g clipPath={`url(#sil-clip-${uid})`}>
              {/* Body gradient fill */}
              <rect
                x="0"
                y="0"
                width="100"
                height="120"
                fill={`url(#sil-reveal-${uid})`}
                opacity={lerp(0, 0.15, (stage - 4) / 12)}
              />

              {/* Skin areas (face, hands) */}
              {stage >= 6 && (
                <>
                  {/* Face */}
                  <ellipse
                    cx="50"
                    cy="22"
                    rx="11"
                    ry="14"
                    fill="#e0c8a8"
                    opacity={lerp(0, 0.8, (stage - 6) / 10)}
                  />
                </>
              )}

              {/* Eyes */}
              {stage >= 7 && (
                <>
                  <circle
                    cx="45"
                    cy="20"
                    r="1.5"
                    fill="#c084fc"
                    opacity={lerp(0.4, 1, (stage - 7) / 9)}
                  />
                  <circle
                    cx="55"
                    cy="20"
                    r="1.5"
                    fill="#c084fc"
                    opacity={lerp(0.4, 1, (stage - 7) / 9)}
                  />
                  {/* Glow behind eyes */}
                  <circle
                    cx="45"
                    cy="20"
                    r="3"
                    fill="#a855f7"
                    opacity={lerp(0, 0.25, (stage - 7) / 9)}
                    filter={`url(#sil-blur-${uid})`}
                  />
                  <circle
                    cx="55"
                    cy="20"
                    r="3"
                    fill="#a855f7"
                    opacity={lerp(0, 0.25, (stage - 7) / 9)}
                    filter={`url(#sil-blur-${uid})`}
                  />
                </>
              )}

              {/* Clothing details */}
              {stage >= 8 && (
                <>
                  {/* Robe/dress */}
                  <path
                    d="M 38 40 L 35 95 L 65 95 L 62 40 Z"
                    fill="#8B5CF6"
                    opacity={lerp(0, 0.6, (stage - 8) / 8)}
                  />
                  {/* Belt/sash */}
                  <rect
                    x="38"
                    y="52"
                    width="24"
                    height="3"
                    fill="#ffd700"
                    opacity={lerp(0, 0.5, (stage - 8) / 8)}
                  />
                </>
              )}

              {/* Hair */}
              {stage >= 9 && (
                <path
                  d="M 39 18 Q 42 5 50 3 Q 58 5 61 18 L 63 35 Q 60 38 58 40 L 50 18 L 42 40 Q 40 38 37 35 Z"
                  fill="#8B5CF6"
                  opacity={lerp(0, 0.8, (stage - 9) / 7)}
                />
              )}

              {/* Mouth */}
              {stage >= 10 && (
                <path
                  d="M 46 26 Q 50 28 54 26"
                  fill="none"
                  stroke="#c89878"
                  strokeWidth="0.8"
                  opacity={lerp(0, 0.7, (stage - 10) / 6)}
                />
              )}

              {/* Hands holding something glowing */}
              {stage >= 11 && (
                <>
                  <circle
                    cx="32"
                    cy="65"
                    r="3"
                    fill="#e0c8a8"
                    opacity={lerp(0, 0.6, (stage - 11) / 5)}
                  />
                  <circle
                    cx="68"
                    cy="65"
                    r="3"
                    fill="#e0c8a8"
                    opacity={lerp(0, 0.6, (stage - 11) / 5)}
                  />
                  {/* Glowing orb in hands */}
                  <circle
                    cx="50"
                    cy="62"
                    r="4"
                    fill="#2D7FF9"
                    opacity={lerp(0, 0.4, (stage - 11) / 5)}
                    filter={`url(#sil-blur-${uid})`}
                  />
                  <circle
                    cx="50"
                    cy="62"
                    r="2"
                    fill="white"
                    opacity={lerp(0, 0.6, (stage - 11) / 5)}
                  />
                </>
              )}
            </g>
          )}

          {/* Crown / identity marker */}
          {stage >= 12 && (
            <>
              <circle
                cx="50"
                cy="4"
                r={lerp(1, 3, (stage - 12) / 4)}
                fill="#ffd700"
                opacity={lerp(0.3, 0.8, (stage - 12) / 4)}
              />
              <circle
                cx="45"
                cy="6"
                r={lerp(0.5, 1.5, (stage - 12) / 4)}
                fill="#ffd700"
                opacity={lerp(0.2, 0.6, (stage - 12) / 4)}
              />
              <circle
                cx="55"
                cy="6"
                r={lerp(0.5, 1.5, (stage - 12) / 4)}
                fill="#ffd700"
                opacity={lerp(0.2, 0.6, (stage - 12) / 4)}
              />
            </>
          )}

          {/* Aura outline at peak */}
          {stage >= 14 && (
            <path
              d={SILHOUETTE_PATH}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={lerp(0.5, 1.5, (stage - 14) / 2)}
              opacity={lerp(0.2, 0.5, (stage - 14) / 2)}
              filter={`url(#sil-blur-${uid})`}
              className={cn(animate && 'lyra-core-pulse')}
            />
          )}

          {/* Particle effects */}
          {stage >= 13 && (
            <>
              {[
                { cx: 20, cy: 30 },
                { cx: 80, cy: 25 },
                { cx: 15, cy: 70 },
                { cx: 85, cy: 65 },
                { cx: 30, cy: 100 },
                { cx: 70, cy: 95 },
              ]
                .slice(0, Math.min(stage - 12, 6))
                .map((dot) => (
                  <circle
                    key={`${dot.cx}-${dot.cy}`}
                    cx={dot.cx}
                    cy={dot.cy}
                    r="1"
                    fill={dot.cx > 50 ? '#8B5CF6' : '#2D7FF9'}
                    opacity="0.4"
                    className={cn(animate && 'lyra-satellite')}
                  />
                ))}
            </>
          )}
        </g>
      )}

      {/* Name label */}
      {stage >= 9 && (
        <text
          x="50"
          y="115"
          textAnchor="middle"
          fontSize="5"
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

// Humanoid silhouette SVG path — standing figure with flowing hair/dress
const SILHOUETTE_PATH =
  'M 50 3 ' +
  'Q 61 5 62 18 L 63 30 Q 65 35 70 40 L 75 50 Q 76 55 72 58 L 68 60 L 70 75 L 72 95 Q 72 100 68 100 L 60 100 Q 58 100 58 95 L 56 75 L 50 72 L 44 75 L 42 95 Q 42 100 40 100 L 32 100 Q 28 100 28 95 L 30 75 L 32 60 L 28 58 Q 24 55 25 50 L 30 40 Q 35 35 37 30 L 38 18 Q 39 5 50 3 Z'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}
