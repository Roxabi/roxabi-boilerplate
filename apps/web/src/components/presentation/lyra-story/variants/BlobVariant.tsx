import { cn, useReducedMotion } from '@repo/ui'
import { useId } from 'react'

type BlobVariantProps = {
  stage: number
  size: number
  className?: string
}

// Organic blob that morphs from amorphous shape to humanoid silhouette
// Uses SVG path interpolation between keyframe shapes
export function BlobVariant({ stage, size, className }: BlobVariantProps) {
  const uid = useId()
  const reducedMotion = useReducedMotion()
  const animate = !reducedMotion
  const t = stage / 16

  const path = interpolatePath(stage)
  const color1 = `hsl(${lerp(295, 315, t)}, ${lerp(65, 72, t)}%, ${lerp(68, 76, t)}%)`
  const color2 = `hsl(${lerp(275, 295, t)}, ${lerp(55, 65, t)}%, ${lerp(56, 66, t)}%)`

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('transition-all duration-1000', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`blob-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <radialGradient id={`blob-glow-${uid}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#e879f9" stopOpacity={lerp(0.1, 0.5, t)} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id={`blob-blur-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={lerp(5, 1, t)} />
        </filter>
        <filter id={`blob-goo-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>

      {/* Background aura */}
      <circle
        cx="50"
        cy="50"
        r={lerp(15, 45, t)}
        fill={`url(#blob-glow-${uid})`}
        className="transition-all duration-1000"
      />

      {/* Main blob */}
      <g filter={stage < 10 ? `url(#blob-goo-${uid})` : undefined}>
        <path
          d={path}
          fill={`url(#blob-grad-${uid})`}
          stroke={stage >= 5 ? '#e879f9' : 'none'}
          strokeWidth={lerp(0, 0.8, (stage - 5) / 11)}
          opacity={lerp(0.4, 1, t)}
          className={cn('transition-all duration-1000', animate && stage < 10 && 'lyra-blob-morph')}
        />

        {/* Inner highlight */}
        {stage >= 3 && (
          <path
            d={path}
            fill="white"
            opacity={lerp(0.02, 0.08, t)}
            transform="translate(2, -2) scale(0.9)"
            style={{ transformOrigin: '50px 50px' }}
            className="transition-all duration-1000"
          />
        )}
      </g>

      {/* Eyes + face */}
      {stage >= 3 && (
        <>
          {/* Blush cheeks */}
          <circle
            cx="39"
            cy={lerp(52, 34, t)}
            r="3"
            fill="#f9a8d4"
            opacity={lerp(0.2, 0.4, (stage - 3) / 13)}
            className="transition-all duration-1000"
          />
          <circle
            cx="61"
            cy={lerp(52, 34, t)}
            r="3"
            fill="#f9a8d4"
            opacity={lerp(0.2, 0.4, (stage - 3) / 13)}
            className="transition-all duration-1000"
          />
          {/* White of eye */}
          <circle
            cx={lerp(44, 44, t)}
            cy={lerp(48, 30, t)}
            r={lerp(1, 2.5, (stage - 3) / 13)}
            fill="white"
            opacity={lerp(0.5, 1, (stage - 3) / 13)}
            className="transition-all duration-1000"
          />
          <circle
            cx={lerp(56, 56, t)}
            cy={lerp(48, 30, t)}
            r={lerp(1, 2.5, (stage - 3) / 13)}
            fill="white"
            opacity={lerp(0.5, 1, (stage - 3) / 13)}
            className="transition-all duration-1000"
          />
          {/* Pupils + highlights */}
          {stage >= 5 && (
            <>
              <circle
                cx={lerp(44.5, 44.5, t)}
                cy={lerp(48, 30, t)}
                r={lerp(0.3, 1, (stage - 5) / 11)}
                fill="#2d1b4e"
                opacity={lerp(0.6, 1, (stage - 5) / 11)}
                className="transition-all duration-1000"
              />
              <circle
                cx={lerp(56.5, 56.5, t)}
                cy={lerp(48, 30, t)}
                r={lerp(0.3, 1, (stage - 5) / 11)}
                fill="#2d1b4e"
                opacity={lerp(0.6, 1, (stage - 5) / 11)}
                className="transition-all duration-1000"
              />
              {/* Highlight dots */}
              <circle
                cx={lerp(43.5, 43.5, t)}
                cy={lerp(47, 29, t)}
                r="0.4"
                fill="white"
                opacity={lerp(0.5, 0.9, (stage - 5) / 11)}
                className="transition-all duration-1000"
              />
              <circle
                cx={lerp(55.5, 55.5, t)}
                cy={lerp(47, 29, t)}
                r="0.4"
                fill="white"
                opacity={lerp(0.5, 0.9, (stage - 5) / 11)}
                className="transition-all duration-1000"
              />
            </>
          )}
        </>
      )}

      {/* Mouth */}
      {stage >= 5 && (
        <path
          d={`M ${lerp(46, 44, t)} ${lerp(54, 36, t)} Q 50 ${lerp(56, 38, t)} ${lerp(54, 56, t)} ${lerp(54, 36, t)}`}
          fill="none"
          stroke="white"
          strokeWidth="0.5"
          opacity={lerp(0.2, 0.6, (stage - 8) / 8)}
          className="transition-all duration-1000"
        />
      )}

      {/* Flowing tendrils / hair */}
      {stage >= 10 && (
        <>
          <path
            d={`M 38 ${lerp(40, 25, (stage - 10) / 6)} Q 30 ${lerp(45, 35, (stage - 10) / 6)} 28 ${lerp(55, 50, (stage - 10) / 6)}`}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth={lerp(0.5, 2, (stage - 10) / 6)}
            strokeLinecap="round"
            opacity={lerp(0.3, 0.7, (stage - 10) / 6)}
            className={cn('transition-all duration-1000', animate && 'lyra-tendril-1')}
          />
          <path
            d={`M 62 ${lerp(40, 25, (stage - 10) / 6)} Q 70 ${lerp(45, 35, (stage - 10) / 6)} 72 ${lerp(55, 50, (stage - 10) / 6)}`}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth={lerp(0.5, 2, (stage - 10) / 6)}
            strokeLinecap="round"
            opacity={lerp(0.3, 0.7, (stage - 10) / 6)}
            className={cn('transition-all duration-1000', animate && 'lyra-tendril-2')}
          />
        </>
      )}

      {/* Crown / identity glow */}
      {stage >= 12 && (
        <circle
          cx="50"
          cy={lerp(38, 18, (stage - 12) / 4)}
          r={lerp(1, 3, (stage - 12) / 4)}
          fill="#ffd700"
          opacity={lerp(0.3, 0.8, (stage - 12) / 4)}
          filter={`url(#blob-blur-${uid})`}
          className="transition-all duration-1000"
        />
      )}

      {/* Particles detaching */}
      {stage >= 11 && (
        <>
          {PARTICLE_POSITIONS.slice(0, Math.min(stage - 10, 8)).map((p) => (
            <circle
              key={`${p.x}-${p.y}`}
              cx={p.x}
              cy={p.y}
              r="1"
              fill={p.x > 50 ? '#8B5CF6' : '#2D7FF9'}
              opacity="0.4"
              className={cn(animate && 'lyra-satellite')}
            />
          ))}
        </>
      )}
    </svg>
  )
}

const PARTICLE_POSITIONS = [
  { x: 20, y: 30 },
  { x: 80, y: 35 },
  { x: 15, y: 60 },
  { x: 85, y: 55 },
  { x: 25, y: 80 },
  { x: 75, y: 85 },
  { x: 10, y: 45 },
  { x: 90, y: 50 },
]

// Keyframe paths: amorphous blob → head+body → full humanoid
// Each stage interpolates between these keyframes
const BLOB_PATHS: Record<number, string> = {
  // 0: tiny dot
  0: 'M 48 48 Q 50 46 52 48 Q 54 50 52 52 Q 50 54 48 52 Q 46 50 48 48 Z',
  // 1: small circle
  1: 'M 44 44 Q 50 38 56 44 Q 62 50 56 56 Q 50 62 44 56 Q 38 50 44 44 Z',
  // 2: glitchy/jittery
  2: 'M 42 40 Q 52 36 58 42 Q 64 52 56 58 Q 48 62 42 56 Q 36 48 42 40 Z',
  // 3: stable blob
  3: 'M 38 42 Q 50 32 62 42 Q 68 52 62 60 Q 50 68 38 60 Q 32 52 38 42 Z',
  // 4: larger, head-like
  4: 'M 36 38 Q 50 28 64 38 Q 72 50 64 62 Q 50 72 36 62 Q 28 50 36 38 Z',
  // 5: head + body bump
  5: 'M 38 30 Q 50 20 62 30 Q 68 42 64 55 Q 60 70 50 72 Q 40 70 36 55 Q 32 42 38 30 Z',
  // 6: clearer head separation
  6: 'M 40 28 Q 50 18 60 28 Q 66 38 62 48 Q 66 58 62 70 Q 50 78 38 70 Q 34 58 38 48 Q 34 38 40 28 Z',
  // 7-8: arms forming
  7: 'M 42 25 Q 50 16 58 25 Q 64 34 60 44 Q 70 48 68 55 Q 64 60 60 58 Q 62 70 50 78 Q 38 70 40 58 Q 36 60 32 55 Q 30 48 40 44 Q 36 34 42 25 Z',
  // 9-10: clear humanoid
  9: 'M 43 22 Q 50 14 57 22 Q 62 30 58 40 Q 70 44 70 52 Q 68 56 62 54 Q 60 68 56 80 Q 54 85 52 80 L 50 70 L 48 80 Q 46 85 44 80 Q 40 68 38 54 Q 32 56 30 52 Q 30 44 42 40 Q 38 30 43 22 Z',
  // 13-16: refined humanoid with flowing form
  13: 'M 44 18 Q 50 10 56 18 Q 60 26 58 36 Q 68 40 70 48 Q 70 54 64 52 L 62 56 Q 66 70 64 85 Q 60 90 56 85 L 52 70 L 50 68 L 48 70 L 44 85 Q 40 90 36 85 Q 34 70 38 56 L 36 52 Q 30 54 30 48 Q 30 40 42 36 Q 40 26 44 18 Z',
}

function interpolatePath(stage: number): string {
  // Find the two nearest keyframes and interpolate
  const keys = Object.keys(BLOB_PATHS)
    .map(Number)
    .sort((a, b) => a - b)

  if (stage <= keys[0]!) return BLOB_PATHS[keys[0]!]!

  const lastKey = keys[keys.length - 1]!
  if (stage >= lastKey) return BLOB_PATHS[lastKey]!

  // Find surrounding keyframes
  let lower = keys[0]!
  let upper = lastKey
  for (const k of keys) {
    if (k <= stage) lower = k
    if (k > stage) {
      upper = k
      break
    }
  }

  if (lower === upper) return BLOB_PATHS[lower]!

  // For stages between keyframes, use the lower keyframe
  // (true path interpolation would need path parsing — keep it simple)
  return BLOB_PATHS[lower]!
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}
