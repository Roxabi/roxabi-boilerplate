import { useReducedMotion } from '@repo/ui'
import { useId } from 'react'

type QuantumOrbitalProps = {
  size?: number
  className?: string
  animate?: boolean
}

/**
 * Quantum Orbital — decorative SVG ported from the Lyra speaking indicator (V2).
 * Spinning elliptical rings, orbiting electrons, pulsing core with radial gradient.
 * aria-hidden="true" — purely decorative.
 */
export function QuantumOrbital({ size = 240, className, animate = true }: QuantumOrbitalProps) {
  const reducedMotion = useReducedMotion()
  const shouldAnimate = animate && !reducedMotion

  // Unique ID suffix to avoid collisions when multiple instances are rendered
  const uid = useId()

  return (
    <svg
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`i2bg-${uid}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#0a0416" />
          <stop offset="100%" stopColor="#0D0D0D" />
        </radialGradient>
        <radialGradient id={`i2core-${uid}`} cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#2D7FF9" stopOpacity="0" />
        </radialGradient>
        <filter id={`i2glow-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`i2softglow-${uid}`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* No background rect — transparent so it composites with the page background */}

      {/* Aura */}
      <circle
        className={shouldAnimate ? 'v2-aura' : undefined}
        cx="120"
        cy="120"
        r="88"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="0.5"
        opacity="0.12"
        filter={`url(#i2softglow-${uid})`}
      />

      {/* Orbital ring 1 — tilted -35° */}
      <g
        className={shouldAnimate ? 'v2-ring1' : undefined}
        style={{ transformOrigin: '120px 120px' }}
      >
        <ellipse
          className={shouldAnimate ? 'v2-ring1-path' : undefined}
          cx="120"
          cy="120"
          rx="88"
          ry="28"
          fill="none"
          stroke="#2D7FF9"
          strokeWidth="1"
          opacity="0.65"
          transform="rotate(-35, 120, 120)"
        />
      </g>

      {/* Orbital ring 2 — tilted +55° */}
      <g
        className={shouldAnimate ? 'v2-ring2' : undefined}
        style={{ transformOrigin: '120px 120px' }}
      >
        <ellipse
          className={shouldAnimate ? 'v2-ring2-path' : undefined}
          cx="120"
          cy="120"
          rx="88"
          ry="28"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="0.8"
          opacity="0.55"
          transform="rotate(55, 120, 120)"
        />
      </g>

      {/* Orbital ring 3 — equatorial flat */}
      <g
        className={shouldAnimate ? 'v2-ring3' : undefined}
        style={{ transformOrigin: '120px 120px' }}
      >
        <ellipse
          cx="120"
          cy="120"
          rx="88"
          ry="22"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="0.5"
          opacity="0.2"
        />
      </g>

      {/* Inner ring 1 */}
      <g
        className={shouldAnimate ? 'v2-ring-inner1' : undefined}
        style={{ transformOrigin: '120px 120px' }}
      >
        <ellipse
          cx="120"
          cy="120"
          rx="60"
          ry="20"
          fill="none"
          stroke="#2D7FF9"
          strokeWidth="0.6"
          opacity="0.4"
          transform="rotate(20, 120, 120)"
        />
      </g>

      {/* Inner ring 2 */}
      <g
        className={shouldAnimate ? 'v2-ring-inner2' : undefined}
        style={{ transformOrigin: '120px 120px' }}
      >
        <ellipse
          cx="120"
          cy="120"
          rx="60"
          ry="20"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="0.5"
          opacity="0.35"
          transform="rotate(-70, 120, 120)"
        />
      </g>

      {/* Electrons */}
      <g filter={`url(#i2glow-${uid})`} style={{ transformOrigin: '120px 120px' }}>
        <circle
          className={shouldAnimate ? 'v2-e1' : undefined}
          cx="120"
          cy="120"
          r="3.5"
          fill="#2D7FF9"
          style={{ transformOrigin: '120px 120px' }}
        />
      </g>
      <g filter={`url(#i2glow-${uid})`} style={{ transformOrigin: '120px 120px' }}>
        <circle
          className={shouldAnimate ? 'v2-e2' : undefined}
          cx="120"
          cy="120"
          r="3"
          fill="#2D7FF9"
          style={{ transformOrigin: '120px 120px' }}
        />
      </g>
      <g filter={`url(#i2glow-${uid})`} style={{ transformOrigin: '120px 120px' }}>
        <circle
          className={shouldAnimate ? 'v2-e3' : undefined}
          cx="120"
          cy="120"
          r="3"
          fill="#8B5CF6"
          style={{ transformOrigin: '120px 120px', animationDirection: 'reverse' }}
        />
      </g>
      <g filter={`url(#i2glow-${uid})`} style={{ transformOrigin: '120px 120px' }}>
        <circle
          className={shouldAnimate ? 'v2-e4' : undefined}
          cx="120"
          cy="120"
          r="2.5"
          fill="#8B5CF6"
          style={{ transformOrigin: '120px 120px', animationDirection: 'reverse' }}
        />
      </g>
      <g filter={`url(#i2glow-${uid})`} style={{ transformOrigin: '120px 120px' }}>
        <circle
          className={shouldAnimate ? 'v2-e5' : undefined}
          cx="120"
          cy="120"
          r="2.5"
          fill="#ffffff"
          style={{ transformOrigin: '120px 120px' }}
        />
      </g>

      {/* Core */}
      <circle
        className={shouldAnimate ? 'v2-core-outer' : undefined}
        cx="120"
        cy="120"
        r="20"
        fill={`url(#i2core-${uid})`}
        filter={`url(#i2softglow-${uid})`}
      />
      <circle
        className={shouldAnimate ? 'v2-core-mid' : undefined}
        cx="120"
        cy="120"
        r="12"
        fill="#ffffff"
        opacity="0.95"
        filter={`url(#i2glow-${uid})`}
      />
      <circle cx="120" cy="120" r="5" fill="#8B5CF6" />
    </svg>
  )
}
