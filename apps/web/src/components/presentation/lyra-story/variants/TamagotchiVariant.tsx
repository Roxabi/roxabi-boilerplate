import { cn, useReducedMotion } from '@repo/ui'
import { useId } from 'react'

type TamagotchiVariantProps = {
  stage: number
  size: number
  className?: string
}

// Evolution: egg → crack → hatch → baby blob → toddler → child → teen → adult Lyra
export function TamagotchiVariant({ stage, size, className }: TamagotchiVariantProps) {
  const uid = useId()
  const reducedMotion = useReducedMotion()
  const animate = !reducedMotion

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn('transition-all duration-1000', className)}
      aria-hidden="true"
      style={{ imageRendering: stage <= 8 ? 'auto' : 'auto' }}
    >
      <defs>
        <filter id={`tama-glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Screen bezel (tamagotchi shell) */}
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="10"
        fill="#4c1d95"
        stroke="#c084fc"
        strokeWidth="1.5"
      />
      <rect x="3" y="3" width="42" height="42" rx="8" fill="#0d0921" />

      {/* Stage 0-1: Egg */}
      {stage <= 1 && <Egg stage={stage} animate={animate} />}

      {/* Stage 2: Cracking */}
      {stage === 2 && <CrackingEgg animate={animate} />}

      {/* Stage 3-4: Baby blob */}
      {(stage === 3 || stage === 4) && <BabyBlob stage={stage} animate={animate} uid={uid} />}

      {/* Stage 5-6: Toddler */}
      {(stage === 5 || stage === 6) && <Toddler stage={stage} animate={animate} uid={uid} />}

      {/* Stage 7-9: Child */}
      {stage >= 7 && stage <= 9 && <Child stage={stage} animate={animate} uid={uid} />}

      {/* Stage 10-12: Teen */}
      {stage >= 10 && stage <= 12 && <Teen stage={stage} animate={animate} uid={uid} />}

      {/* Stage 13-16: Adult Lyra */}
      {stage >= 13 && <Adult stage={stage} animate={animate} uid={uid} />}

      {/* Hearts / mood indicator */}
      {stage >= 3 && <MoodIndicator stage={stage} />}

      {/* Stats bar */}
      <rect x="6" y="42" width="36" height="2" rx="1" fill="#2e1065" />
      <rect
        x="6"
        y="42"
        width={36 * (stage / 16)}
        height="2"
        rx="1"
        fill="#a78bfa"
        className="transition-all duration-1000"
      />
    </svg>
  )
}

function Egg({ stage, animate }: { stage: number; animate: boolean }) {
  return (
    <g className={cn(animate && 'lyra-tama-wobble')}>
      {/* Egg shape */}
      <ellipse cx="24" cy="26" rx="8" ry="10" fill="#e8e0d0" />
      <ellipse cx="24" cy="26" rx="8" ry="10" fill="none" stroke="#c8b890" strokeWidth="0.5" />
      {/* Spots */}
      <circle cx="21" cy="24" r="1.5" fill="#2D7FF9" opacity="0.3" />
      <circle cx="27" cy="28" r="1" fill="#8B5CF6" opacity="0.3" />
      {/* Sparkle on stage 1 */}
      {stage >= 1 && (
        <>
          <text x="30" y="20" fontSize="4" className={cn(animate && 'lyra-tama-sparkle')}>
            *
          </text>
        </>
      )}
    </g>
  )
}

function CrackingEgg({ animate }: { animate: boolean }) {
  return (
    <g className={cn(animate && 'lyra-glitch')}>
      {/* Egg with cracks */}
      <ellipse cx="24" cy="26" rx="8" ry="10" fill="#e8e0d0" />
      {/* Crack lines */}
      <path d="M 20 24 L 24 26 L 22 30" fill="none" stroke="#8B5CF6" strokeWidth="0.5" />
      <path d="M 28 22 L 26 26 L 29 28" fill="none" stroke="#2D7FF9" strokeWidth="0.5" />
      {/* Light peeking through */}
      <circle cx="24" cy="26" r="2" fill="#2D7FF9" opacity="0.4" />
      {/* Particles */}
      <rect x="19" y="20" width="1" height="1" fill="#e8e0d0" opacity="0.6" />
      <rect x="28" y="22" width="1" height="1" fill="#e8e0d0" opacity="0.5" />
    </g>
  )
}

function BabyBlob({ stage, animate, uid }: { stage: number; animate: boolean; uid: string }) {
  return (
    <g className={cn(animate && 'lyra-tama-bounce')}>
      {/* Blob body */}
      <ellipse cx="24" cy="28" rx="7" ry="6" fill="#2D7FF9" />
      <ellipse
        cx="24"
        cy="28"
        rx="7"
        ry="6"
        fill="#2D7FF9"
        filter={`url(#tama-glow-${uid})`}
        opacity="0.3"
      />
      {/* Eyes — big and cute */}
      <circle cx="21" cy="26" r="2" fill="white" />
      <circle cx="27" cy="26" r="2" fill="white" />
      <circle cx="22" cy="26" r="1" fill="#1a1a3e" />
      <circle cx="28" cy="26" r="1" fill="#1a1a3e" />
      {/* Eye highlights */}
      <circle cx="22.5" cy="25.5" r="0.4" fill="white" />
      <circle cx="28.5" cy="25.5" r="0.4" fill="white" />
      {/* Mouth */}
      {stage >= 4 && (
        <path d="M 22 30 Q 24 32 26 30" fill="none" stroke="#1a1a3e" strokeWidth="0.5" />
      )}
      {/* Blush */}
      <circle cx="18" cy="28" r="1.5" fill="#ff9999" opacity="0.3" />
      <circle cx="30" cy="28" r="1.5" fill="#ff9999" opacity="0.3" />
    </g>
  )
}

function Toddler({ stage, animate, uid }: { stage: number; animate: boolean; uid: string }) {
  return (
    <g className={cn(animate && 'lyra-tama-bounce')}>
      {/* Body — rounder, with tiny legs */}
      <ellipse cx="24" cy="26" rx="7" ry="7" fill="#2D7FF9" />
      <ellipse
        cx="24"
        cy="26"
        rx="7"
        ry="7"
        fill="#2D7FF9"
        filter={`url(#tama-glow-${uid})`}
        opacity="0.2"
      />
      {/* Tiny legs */}
      <rect x="20" y="32" width="2" height="3" rx="1" fill="#1e5fc2" />
      <rect x="26" y="32" width="2" height="3" rx="1" fill="#1e5fc2" />
      {/* Arms (stage 6) */}
      {stage >= 6 && (
        <>
          <rect x="15" y="25" width="3" height="2" rx="1" fill="#2D7FF9" />
          <rect x="30" y="25" width="3" height="2" rx="1" fill="#2D7FF9" />
        </>
      )}
      {/* Face */}
      <circle cx="21" cy="24" r="2" fill="white" />
      <circle cx="27" cy="24" r="2" fill="white" />
      <circle cx="22" cy="24" r="1" fill="#1a1a3e" />
      <circle cx="28" cy="24" r="1" fill="#1a1a3e" />
      <circle cx="22.5" cy="23.5" r="0.4" fill="white" />
      <circle cx="28.5" cy="23.5" r="0.4" fill="white" />
      <path d="M 22 28 Q 24 30 26 28" fill="none" stroke="#1a1a3e" strokeWidth="0.5" />
      {/* Blush */}
      <circle cx="18" cy="26" r="1.5" fill="#ff9999" opacity="0.3" />
      <circle cx="30" cy="26" r="1.5" fill="#ff9999" opacity="0.3" />
      {/* Hair tuft */}
      <path d="M 22 18 Q 24 16 26 18" fill="#8B5CF6" />
    </g>
  )
}

function Child({ stage, animate, uid }: { stage: number; animate: boolean; uid: string }) {
  return (
    <g className={cn(animate && 'lyra-tama-bounce')}>
      {/* Head */}
      <circle cx="24" cy="20" r="7" fill="#2D7FF9" />
      {/* Body */}
      <rect x="20" y="26" width="8" height="6" rx="2" fill="#8B5CF6" />
      {/* Legs */}
      <rect x="20" y="32" width="3" height="4" rx="1" fill="#1a1a3e" />
      <rect x="25" y="32" width="3" height="4" rx="1" fill="#1a1a3e" />
      {/* Arms */}
      <rect x="14" y="27" width="5" height="2" rx="1" fill="#2D7FF9" />
      <rect x="29" y="27" width="5" height="2" rx="1" fill="#2D7FF9" />
      {/* Face */}
      <circle cx="21" cy="19" r="1.5" fill="white" />
      <circle cx="27" cy="19" r="1.5" fill="white" />
      <circle cx="21.5" cy="19" r="0.8" fill="#1a1a3e" />
      <circle cx="27.5" cy="19" r="0.8" fill="#1a1a3e" />
      <path d="M 22 23 Q 24 25 26 23" fill="none" stroke="white" strokeWidth="0.5" />
      {/* Hair */}
      <path d="M 17 18 Q 19 12 24 11 Q 29 12 31 18" fill="#8B5CF6" />
      <circle cx="24" cy="12" r="1" fill="#ffd700" opacity={stage >= 9 ? 1 : 0} />
      {/* Aura glow at stage 8+ */}
      {stage >= 8 && (
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="#2D7FF9"
          filter={`url(#tama-glow-${uid})`}
          opacity="0.06"
        />
      )}
    </g>
  )
}

function Teen({ stage, animate, uid }: { stage: number; animate: boolean; uid: string }) {
  return (
    <g className={cn(animate && 'lyra-tama-bounce')}>
      {/* Taller body */}
      <circle cx="24" cy="16" r="6" fill="#2D7FF9" />
      <rect x="20" y="21" width="8" height="8" rx="2" fill="#8B5CF6" />
      <rect x="19" y="29" width="4" height="6" rx="1" fill="#1a1a3e" />
      <rect x="25" y="29" width="4" height="6" rx="1" fill="#1a1a3e" />
      {/* Arms */}
      <rect x="13" y="22" width="6" height="2" rx="1" fill="#2D7FF9" />
      <rect x="29" y="22" width="6" height="2" rx="1" fill="#2D7FF9" />
      {/* Face */}
      <circle cx="22" cy="15" r="1.2" fill="white" />
      <circle cx="26" cy="15" r="1.2" fill="white" />
      <circle cx="22.3" cy="15" r="0.6" fill="#2D7FF9" />
      <circle cx="26.3" cy="15" r="0.6" fill="#2D7FF9" />
      <path d="M 22 18 Q 24 19.5 26 18" fill="none" stroke="white" strokeWidth="0.5" />
      {/* Hair (longer) */}
      <path d="M 18 15 Q 20 8 24 7 Q 28 8 30 15" fill="#8B5CF6" />
      <path d="M 18 15 Q 17 20 16 22" fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
      <path d="M 30 15 Q 31 20 32 22" fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
      {/* Crown */}
      {stage >= 10 && (
        <>
          <circle cx="24" cy="7" r="1.5" fill="#ffd700" />
          <circle cx="21" cy="8" r="0.8" fill="#ffd700" opacity="0.7" />
          <circle cx="27" cy="8" r="0.8" fill="#ffd700" opacity="0.7" />
        </>
      )}
      {/* Cape */}
      {stage >= 11 && (
        <path d="M 18 21 Q 14 30 12 36 L 36 36 Q 34 30 30 21" fill="#8B5CF6" opacity="0.3" />
      )}
      {/* Companion orbs */}
      {stage >= 12 && (
        <>
          <circle cx="8" cy="14" r="1.5" fill="#2D7FF9" opacity="0.6" />
          <circle cx="40" cy="14" r="1.5" fill="#8B5CF6" opacity="0.6" />
        </>
      )}
      {/* Aura */}
      <circle
        cx="24"
        cy="22"
        r="20"
        fill="#8B5CF6"
        filter={`url(#tama-glow-${uid})`}
        opacity="0.04"
      />
    </g>
  )
}

function Adult({ stage, animate, uid }: { stage: number; animate: boolean; uid: string }) {
  return (
    <g className={cn(animate && 'lyra-tama-bounce')}>
      {/* Full character — elegantly proportioned */}
      {/* Head */}
      <circle cx="24" cy="13" r="5.5" fill="#2D7FF9" />
      {/* Body (dress/robe) */}
      <path d="M 19 18 L 18 35 L 30 35 L 29 18 Z" fill="#8B5CF6" rx="2" />
      <path d="M 20 18 L 19 35 L 29 35 L 28 18 Z" fill="#6d3fc4" />
      {/* Arms */}
      <path d="M 19 19 L 13 24 L 14 25 L 19 21" fill="#2D7FF9" />
      <path d="M 29 19 L 35 24 L 34 25 L 29 21" fill="#2D7FF9" />
      {/* Hands — glowing */}
      <circle cx="13" cy="24" r="1.5" fill="#e0c8a8" />
      <circle cx="35" cy="24" r="1.5" fill="#e0c8a8" />
      {/* Face */}
      <circle cx="22" cy="12" r="1" fill="white" />
      <circle cx="26" cy="12" r="1" fill="white" />
      <circle cx="22.3" cy="12" r="0.5" fill="#2D7FF9" />
      <circle cx="26.3" cy="12" r="0.5" fill="#2D7FF9" />
      <path d="M 22 15 Q 24 16.5 26 15" fill="none" stroke="white" strokeWidth="0.4" />
      {/* Hair — long flowing */}
      <path d="M 18.5 12 Q 20 5 24 4 Q 28 5 29.5 12" fill="#8B5CF6" />
      <path
        d="M 18.5 12 Q 16 20 14 28"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 29.5 12 Q 32 20 34 28"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Crown */}
      <circle cx="24" cy="5" r="2" fill="#ffd700" />
      <circle cx="21" cy="6" r="1" fill="#ffd700" opacity="0.7" />
      <circle cx="27" cy="6" r="1" fill="#ffd700" opacity="0.7" />
      {/* Cape */}
      <path d="M 19 18 Q 12 28 10 36 L 38 36 Q 36 28 29 18" fill="#8B5CF6" opacity="0.25" />
      {/* Aura — grows with stage */}
      <circle
        cx="24"
        cy="22"
        r={lerp(14, 20, (stage - 13) / 3)}
        fill="#2D7FF9"
        filter={`url(#tama-glow-${uid})`}
        opacity={lerp(0.04, 0.1, (stage - 13) / 3)}
      />
      {/* Companion orbs */}
      {stage >= 14 && (
        <>
          <circle
            cx="6"
            cy="10"
            r="1.5"
            fill="#2D7FF9"
            opacity="0.6"
            className={cn(animate && 'lyra-satellite')}
          />
          <circle
            cx="42"
            cy="10"
            r="1.5"
            fill="#8B5CF6"
            opacity="0.6"
            className={cn(animate && 'lyra-satellite')}
          />
          <circle
            cx="6"
            cy="30"
            r="1"
            fill="#8B5CF6"
            opacity="0.4"
            className={cn(animate && 'lyra-satellite')}
          />
          <circle
            cx="42"
            cy="30"
            r="1"
            fill="#2D7FF9"
            opacity="0.4"
            className={cn(animate && 'lyra-satellite')}
          />
        </>
      )}
      {/* Sparkles at peak */}
      {stage >= 15 && (
        <>
          <text
            x="8"
            y="8"
            fontSize="3"
            fill="#ffd700"
            opacity="0.6"
            className={cn(animate && 'lyra-tama-sparkle')}
          >
            *
          </text>
          <text
            x="38"
            y="18"
            fontSize="3"
            fill="#ffd700"
            opacity="0.6"
            className={cn(animate && 'lyra-tama-sparkle')}
          >
            *
          </text>
        </>
      )}
    </g>
  )
}

function MoodIndicator({ stage }: { stage: number }) {
  const hearts = Math.min(Math.floor(stage / 4) + 1, 4)
  return (
    <g>
      {Array.from({ length: hearts }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static heart indicator
        <text
          key={i}
          x={8 + i * 5}
          y="8"
          fontSize="3.5"
          fill={i < hearts - 1 ? '#ff6b9d' : '#ff6b9d80'}
        >
          {'\u2665'}
        </text>
      ))}
    </g>
  )
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}
