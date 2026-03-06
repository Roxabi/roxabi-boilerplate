import { useReducedMotion } from '@repo/ui'
import { useId } from 'react'

type WaveParticleProps = {
  className?: string
  animate?: boolean
}

/**
 * Wave-Particle Duality — decorative SVG ported from the Lyra speaking indicator (V4).
 * Scrolling sine waves (blue, purple, white), probability density dots, pulsing particle core.
 * Stretches to container width at a fixed 200px height.
 * aria-hidden="true" — purely decorative.
 */
export function WaveParticle({ className, animate = true }: WaveParticleProps) {
  const uid = useId()
  const reducedMotion = useReducedMotion()
  const shouldAnimate = animate && !reducedMotion

  return (
    <svg
      viewBox="0 0 960 200"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="200"
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      overflow="hidden"
    >
      <defs>
        <radialGradient id={`wv-bg${uid}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#060612" />
          <stop offset="100%" stopColor="#0D0D0D" />
        </radialGradient>
        <radialGradient id={`wv-particle${uid}`} cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#2D7FF9" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id={`wv-glow${uid}`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`wv-softglow${uid}`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`wv-clip${uid}`}>
          <rect x="0" y="0" width="960" height="200" />
        </clipPath>
      </defs>

      {/* No background rect — transparent so it composites with the page background */}

      <g clipPath={`url(#wv-clip${uid})`}>
        <g className={shouldAnimate ? 'v4-wave-amplitude' : undefined}>
          {/* BG interference faint — wide wave repeating at 240px intervals, scaled to 960 width */}
          <g className={shouldAnimate ? 'v4-wave-bg' : undefined} opacity="0.08">
            <path
              d="M-240 100 Q-210 83 -180 100 Q-150 117 -120 100 Q-90 83 -60 100 Q-30 117 0 100
                 Q30 83 60 100 Q90 117 120 100 Q150 83 180 100 Q210 117 240 100
                 Q270 83 300 100 Q330 117 360 100 Q390 83 420 100 Q450 117 480 100
                 Q510 83 540 100 Q570 117 600 100 Q630 83 660 100 Q690 117 720 100
                 Q750 83 780 100 Q810 117 840 100 Q870 83 900 100 Q930 117 960 100
                 Q990 83 1020 100 Q1050 117 1080 100 Q1110 83 1140 100 Q1170 117 1200 100"
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="1"
            />
          </g>

          {/* Wave 3 — fast tight white */}
          <g className={shouldAnimate ? 'v4-wave3' : undefined} opacity="0.2">
            <path
              d="M-240 100 Q-228 92 -216 100 Q-204 108 -192 100 Q-180 92 -168 100 Q-156 108 -144 100
                 Q-132 92 -120 100 Q-108 108 -96 100 Q-84 92 -72 100 Q-60 108 -48 100
                 Q-36 92 -24 100 Q-12 108 0 100 Q12 92 24 100 Q36 108 48 100
                 Q60 92 72 100 Q84 108 96 100 Q108 92 120 100 Q132 108 144 100
                 Q156 92 168 100 Q180 108 192 100 Q204 92 216 100 Q228 108 240 100
                 Q252 92 264 100 Q276 108 288 100 Q300 92 312 100 Q324 108 336 100
                 Q348 92 360 100 Q372 108 384 100 Q396 92 408 100 Q420 108 432 100
                 Q444 92 456 100 Q468 108 480 100 Q492 92 504 100 Q516 108 528 100
                 Q540 92 552 100 Q564 108 576 100 Q588 92 600 100 Q612 108 624 100
                 Q636 92 648 100 Q660 108 672 100 Q684 92 696 100 Q708 108 720 100
                 Q732 92 744 100 Q756 108 768 100 Q780 92 792 100 Q804 108 816 100
                 Q828 92 840 100 Q852 108 864 100 Q876 92 888 100 Q900 108 912 100
                 Q924 92 936 100 Q948 108 960 100 Q972 92 984 100 Q996 108 1008 100
                 Q1020 92 1032 100 Q1044 108 1056 100 Q1068 92 1080 100 Q1092 108 1104 100
                 Q1116 92 1128 100 Q1140 108 1152 100 Q1164 92 1176 100 Q1188 108 1200 100"
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.6"
            />
          </g>

          {/* Wave 2 — medium purple */}
          <g
            className={shouldAnimate ? 'v4-wave2' : undefined}
            filter={`url(#wv-glow${uid})`}
            opacity="0.55"
          >
            <path
              d="M-240 100 Q-195 68 -150 100 Q-105 132 -60 100 Q-15 68 30 100
                 Q75 132 120 100 Q165 68 210 100 Q255 132 300 100
                 Q345 68 390 100 Q435 132 480 100 Q525 68 570 100
                 Q615 132 660 100 Q705 68 750 100 Q795 132 840 100
                 Q885 68 930 100 Q975 132 1020 100 Q1065 68 1110 100 Q1155 132 1200 100"
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="1.5"
            />
          </g>

          {/* Wave 1 — primary blue */}
          <g
            className={shouldAnimate ? 'v4-wave1' : undefined}
            filter={`url(#wv-glow${uid})`}
            opacity="0.9"
          >
            <path
              d="M-240 100 Q-180 58 -120 100 Q-60 142 0 100 Q60 58 120 100
                 Q180 142 240 100 Q300 58 360 100 Q420 142 480 100
                 Q540 58 600 100 Q660 142 720 100 Q780 58 840 100
                 Q900 142 960 100 Q1020 58 1080 100 Q1140 142 1200 100"
              fill="none"
              stroke="#2D7FF9"
              strokeWidth="2.5"
            />
          </g>
        </g>

        {/* Probability density dots — spread across 960px width */}
        <g className={shouldAnimate ? 'v4-pdot' : undefined} fill="#2D7FF9" opacity="0.5">
          <circle cx="120" cy="100" r="1.5" />
          <circle cx="300" cy="100" r="2" />
          <circle cx="480" cy="100" r="1.5" />
          <circle cx="660" cy="100" r="2" />
          <circle cx="840" cy="100" r="1.5" />
        </g>
        <g className={shouldAnimate ? 'v4-pdot' : undefined} fill="#8B5CF6" opacity="0.4">
          <circle cx="40" cy="100" r="1" />
          <circle cx="220" cy="100" r="1.2" />
          <circle cx="400" cy="100" r="1" />
          <circle cx="580" cy="100" r="1.2" />
          <circle cx="760" cy="100" r="1" />
          <circle cx="940" cy="100" r="1" />
        </g>
      </g>

      {/* Vertical dashed axis — center */}
      <line
        x1="480"
        y1="20"
        x2="480"
        y2="180"
        stroke="#8B5CF6"
        strokeWidth="0.5"
        strokeDasharray="3 7"
        opacity="0.2"
      />

      {/* Particle core — collapse point at center */}
      <circle
        className={shouldAnimate ? 'v4-particle-glow' : undefined}
        cx="480"
        cy="100"
        r="22"
        fill="#2D7FF9"
        opacity="0.15"
        filter={`url(#wv-softglow${uid})`}
      />
      <circle
        cx="480"
        cy="100"
        r="16"
        fill={`url(#wv-particle${uid})`}
        filter={`url(#wv-softglow${uid})`}
      />
      <circle
        className={shouldAnimate ? 'v4-particle' : undefined}
        cx="480"
        cy="100"
        r="7"
        fill="#ffffff"
        filter={`url(#wv-glow${uid})`}
      />
      <circle cx="480" cy="100" r="3.5" fill="#8B5CF6" />

      {/* Quantum formula */}
      <text
        x="480"
        y="190"
        textAnchor="middle"
        fontFamily="Courier New, monospace"
        fontSize="8"
        letterSpacing="2"
        fill="#2D7FF9"
        opacity="0.3"
      >
        |ψ⟩ = α|0⟩ + β|1⟩
      </text>
    </svg>
  )
}
