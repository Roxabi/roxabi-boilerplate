// biome-ignore lint/nursery/noExcessiveLinesPerFile: SVG-heavy visual component with 5 evolution phases
import { cn, useReducedMotion } from '@repo/ui'
import { useId } from 'react'

type PokemonVariantProps = {
  stage: number
  size: number
  className?: string
}

const BLUE = '#2D7FF9'
const PURPLE = '#8B5CF6'
const LIGHT_BLUE = '#7BB8FF'
const DARK_BLUE = '#1a3a6e'
const WHITE = '#ffffff'
const GOLD = '#ffd700'

// Evolution phases:
// 0-1:   Egg
// 2:     Cracking egg
// 3-5:   Baby — small round creature, big eyes, stubby limbs
// 6-9:   Teen — ears grow, tail appears, more defined body
// 10-13: Adult — crest/mane, wings/fins, powerful stance
// 14-16: Mega — glowing aura, crystal patterns, ultimate form

export function PokemonVariant({ stage, size, className }: PokemonVariantProps) {
  const uid = useId()
  const reducedMotion = useReducedMotion()
  const animate = !reducedMotion
  const t = stage / 16

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('transition-all duration-1000', className)}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`pk-glow-${uid}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={BLUE} stopOpacity={lerp(0, 0.3, t)} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id={`pk-blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id={`pk-soft-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Background aura (mega stage) */}
      {stage >= 14 && (
        <circle
          cx="50"
          cy="50"
          r={lerp(30, 45, (stage - 14) / 2)}
          fill={`url(#pk-glow-${uid})`}
          opacity={lerp(0.3, 0.6, (stage - 14) / 2)}
          filter={`url(#pk-soft-${uid})`}
          className={cn(animate && 'lyra-core-pulse')}
        />
      )}

      {stage <= 2 ? (
        <Egg stage={stage} uid={uid} animate={animate} />
      ) : stage <= 5 ? (
        <Baby stage={stage} uid={uid} animate={animate} />
      ) : stage <= 9 ? (
        <Teen stage={stage} uid={uid} animate={animate} />
      ) : stage <= 13 ? (
        <Adult stage={stage} uid={uid} animate={animate} />
      ) : (
        <Mega stage={stage} uid={uid} animate={animate} />
      )}
    </svg>
  )
}

// ─── Egg ─────────────────────────────────────────────────────────────────────

function Egg({ stage, animate }: { stage: number; uid: string; animate: boolean }) {
  const wobble = stage === 2 && animate

  return (
    <g className={cn(wobble && 'lyra-tama-wobble')}>
      {/* Egg body */}
      <ellipse
        cx="50"
        cy="55"
        rx={stage === 0 ? 8 : 14}
        ry={stage === 0 ? 10 : 18}
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="1.5"
        className="transition-all duration-1000"
      />
      {/* Egg pattern — zigzag line */}
      {stage >= 1 && (
        <path
          d="M 38 52 L 42 48 L 46 52 L 50 48 L 54 52 L 58 48 L 62 52"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={0.6}
          className="transition-all duration-1000"
        />
      )}
      {/* Star mark */}
      {stage >= 1 && (
        <polygon
          points="50,40 51.5,44 56,44 52.5,46.5 54,50 50,48 46,50 47.5,46.5 44,44 48.5,44"
          fill={GOLD}
          opacity={0.7}
          className="transition-all duration-500"
        />
      )}
      {/* Crack lines */}
      {stage === 2 && (
        <>
          <path
            d="M 44 45 L 47 50 L 44 55"
            fill="none"
            stroke={DARK_BLUE}
            strokeWidth="1"
            opacity="0.6"
          />
          <path
            d="M 56 43 L 53 48 L 57 52"
            fill="none"
            stroke={DARK_BLUE}
            strokeWidth="1"
            opacity="0.6"
          />
        </>
      )}
    </g>
  )
}

// ─── Baby (stages 3-5) ──────────────────────────────────────────────────────

function Baby({ stage, animate }: { stage: number; uid: string; animate: boolean }) {
  const bounce = animate
  const eyeSize = lerp(3, 4, (stage - 3) / 2)

  return (
    <g className={cn(bounce && 'lyra-tama-bounce')}>
      {/* Body — round blob */}
      <ellipse
        cx="50"
        cy="58"
        rx={lerp(14, 16, (stage - 3) / 2)}
        ry={lerp(12, 14, (stage - 3) / 2)}
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="1.2"
        className="transition-all duration-1000"
      />

      {/* Head — slightly overlapping top of body */}
      <circle
        cx="50"
        cy="42"
        r={lerp(12, 14, (stage - 3) / 2)}
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="1.2"
        className="transition-all duration-1000"
      />

      {/* Eyes — big and cute */}
      <circle cx="44" cy="40" r={eyeSize} fill={WHITE} />
      <circle cx="56" cy="40" r={eyeSize} fill={WHITE} />
      <circle cx={lerp(44.5, 45, (stage - 3) / 2)} cy="40" r={eyeSize * 0.55} fill={DARK_BLUE} />
      <circle cx={lerp(56.5, 57, (stage - 3) / 2)} cy="40" r={eyeSize * 0.55} fill={DARK_BLUE} />
      {/* Eye shine */}
      <circle cx="43" cy="39" r="1" fill={WHITE} opacity="0.9" />
      <circle cx="55" cy="39" r="1" fill={WHITE} opacity="0.9" />

      {/* Mouth — small happy curve */}
      <path
        d="M 47 45 Q 50 48 53 45"
        fill="none"
        stroke={DARK_BLUE}
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Stubby arms */}
      {stage >= 4 && (
        <>
          <ellipse
            cx="35"
            cy="54"
            rx="4"
            ry="3"
            fill={LIGHT_BLUE}
            stroke={BLUE}
            strokeWidth="0.8"
          />
          <ellipse
            cx="65"
            cy="54"
            rx="4"
            ry="3"
            fill={LIGHT_BLUE}
            stroke={BLUE}
            strokeWidth="0.8"
          />
        </>
      )}

      {/* Small feet */}
      {stage >= 4 && (
        <>
          <ellipse cx="44" cy="70" rx="4" ry="2.5" fill={BLUE} opacity="0.7" />
          <ellipse cx="56" cy="70" rx="4" ry="2.5" fill={BLUE} opacity="0.7" />
        </>
      )}

      {/* Tiny ear bumps */}
      {stage >= 5 && (
        <>
          <ellipse
            cx="40"
            cy="30"
            rx="3"
            ry="5"
            fill={LIGHT_BLUE}
            stroke={BLUE}
            strokeWidth="0.8"
            transform="rotate(-15, 40, 30)"
          />
          <ellipse
            cx="60"
            cy="30"
            rx="3"
            ry="5"
            fill={LIGHT_BLUE}
            stroke={BLUE}
            strokeWidth="0.8"
            transform="rotate(15, 60, 30)"
          />
        </>
      )}

      {/* Star mark on forehead */}
      <polygon
        points="50,33 51,35 53,35 51.5,36.5 52,38.5 50,37.5 48,38.5 48.5,36.5 47,35 49,35"
        fill={GOLD}
        opacity="0.7"
      />
    </g>
  )
}

// ─── Teen (stages 6-9) ──────────────────────────────────────────────────────

function Teen({ stage, uid, animate }: { stage: number; uid: string; animate: boolean }) {
  const t = (stage - 6) / 3

  return (
    <g className={cn(animate && 'lyra-tama-bounce')}>
      {/* Tail */}
      <path
        d={`M 62 62 Q ${lerp(70, 75, t)} ${lerp(55, 50, t)} ${lerp(72, 80, t)} ${lerp(45, 38, t)}`}
        fill="none"
        stroke={PURPLE}
        strokeWidth={lerp(2, 3, t)}
        strokeLinecap="round"
        opacity={lerp(0.5, 0.9, t)}
        className={cn('transition-all duration-1000', animate && 'lyra-tendril-1')}
      />
      {/* Tail tip glow */}
      {stage >= 8 && (
        <circle
          cx={lerp(72, 80, t)}
          cy={lerp(45, 38, t)}
          r="3"
          fill={BLUE}
          opacity="0.5"
          filter={`url(#pk-blur-${uid})`}
        />
      )}

      {/* Body */}
      <ellipse
        cx="50"
        cy="62"
        rx={lerp(14, 16, t)}
        ry={lerp(11, 13, t)}
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="1.2"
        className="transition-all duration-1000"
      />

      {/* Head */}
      <circle
        cx="50"
        cy="40"
        r={lerp(13, 15, t)}
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="1.2"
        className="transition-all duration-1000"
      />

      {/* Ears — growing taller */}
      <path
        d={`M 39 32 Q ${lerp(36, 33, t)} ${lerp(22, 14, t)} ${lerp(42, 40, t)} ${lerp(28, 24, t)}`}
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="1"
        className="transition-all duration-1000"
      />
      <path
        d={`M 61 32 Q ${lerp(64, 67, t)} ${lerp(22, 14, t)} ${lerp(58, 60, t)} ${lerp(28, 24, t)}`}
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="1"
        className="transition-all duration-1000"
      />
      {/* Inner ear color */}
      {stage >= 7 && (
        <>
          <path d={`M 40 31 Q 35 20 41 26`} fill={PURPLE} opacity="0.3" />
          <path d={`M 60 31 Q 65 20 59 26`} fill={PURPLE} opacity="0.3" />
        </>
      )}

      {/* Eyes */}
      <circle cx="43" cy="38" r={lerp(3.5, 4, t)} fill={WHITE} />
      <circle cx="57" cy="38" r={lerp(3.5, 4, t)} fill={WHITE} />
      <circle cx="44" cy="38" r={lerp(2, 2.5, t)} fill={BLUE} />
      <circle cx="58" cy="38" r={lerp(2, 2.5, t)} fill={BLUE} />
      <circle cx="43" cy="37" r="1" fill={WHITE} opacity="0.9" />
      <circle cx="57" cy="37" r="1" fill={WHITE} opacity="0.9" />

      {/* Mouth */}
      <path
        d={`M 46 44 Q 50 ${lerp(47, 48, t)} 54 44`}
        fill="none"
        stroke={DARK_BLUE}
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Arms */}
      <ellipse
        cx="34"
        cy="58"
        rx={lerp(4, 5, t)}
        ry="3.5"
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="0.8"
      />
      <ellipse
        cx="66"
        cy="58"
        rx={lerp(4, 5, t)}
        ry="3.5"
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="0.8"
      />

      {/* Feet */}
      <ellipse cx="43" cy="73" rx="5" ry="3" fill={BLUE} opacity="0.7" />
      <ellipse cx="57" cy="73" rx="5" ry="3" fill={BLUE} opacity="0.7" />

      {/* Chest marking */}
      {stage >= 8 && (
        <ellipse
          cx="50"
          cy="60"
          rx="6"
          ry="5"
          fill={WHITE}
          opacity="0.3"
          className="transition-all duration-1000"
        />
      )}

      {/* Forehead star */}
      <polygon
        points="50,30 51.2,33 54,33 52,34.8 52.8,37.5 50,36 47.2,37.5 48,34.8 46,33 48.8,33"
        fill={GOLD}
        opacity={lerp(0.6, 0.9, t)}
      />
    </g>
  )
}

// ─── Adult (stages 10-13) ───────────────────────────────────────────────────

function Adult({ stage, uid, animate }: { stage: number; uid: string; animate: boolean }) {
  const t = (stage - 10) / 3

  return (
    <g>
      {/* Aura circle */}
      <circle
        cx="50"
        cy="50"
        r={lerp(35, 42, t)}
        fill="none"
        stroke={PURPLE}
        strokeWidth="0.5"
        opacity={lerp(0.1, 0.3, t)}
        filter={`url(#pk-soft-${uid})`}
        className="transition-all duration-1000"
      />

      {/* Tail — longer, flowing */}
      <path
        d={`M 64 58 Q 78 48 ${lerp(80, 85, t)} ${lerp(35, 28, t)} Q ${lerp(82, 88, t)} ${lerp(28, 20, t)} ${lerp(78, 82, t)} ${lerp(25, 18, t)}`}
        fill="none"
        stroke={PURPLE}
        strokeWidth={lerp(2.5, 3.5, t)}
        strokeLinecap="round"
        className={cn('transition-all duration-1000', animate && 'lyra-tendril-1')}
      />
      {/* Tail tip star */}
      {stage >= 12 && (
        <circle
          cx={lerp(78, 82, t)}
          cy={lerp(25, 18, t)}
          r="3"
          fill={GOLD}
          opacity="0.7"
          filter={`url(#pk-blur-${uid})`}
          className={cn(animate && 'lyra-star-pulse')}
        />
      )}

      {/* Wings/fins */}
      {stage >= 11 && (
        <>
          <path
            d={`M 38 50 Q ${lerp(25, 18, (stage - 11) / 2)} ${lerp(42, 35, (stage - 11) / 2)} ${lerp(22, 15, (stage - 11) / 2)} ${lerp(50, 45, (stage - 11) / 2)} Q ${lerp(28, 22, (stage - 11) / 2)} ${lerp(55, 52, (stage - 11) / 2)} 38 55`}
            fill={PURPLE}
            opacity={lerp(0.2, 0.5, (stage - 11) / 2)}
            stroke={PURPLE}
            strokeWidth="0.5"
            className="transition-all duration-1000"
          />
          <path
            d={`M 62 50 Q ${lerp(75, 82, (stage - 11) / 2)} ${lerp(42, 35, (stage - 11) / 2)} ${lerp(78, 85, (stage - 11) / 2)} ${lerp(50, 45, (stage - 11) / 2)} Q ${lerp(72, 78, (stage - 11) / 2)} ${lerp(55, 52, (stage - 11) / 2)} 62 55`}
            fill={PURPLE}
            opacity={lerp(0.2, 0.5, (stage - 11) / 2)}
            stroke={PURPLE}
            strokeWidth="0.5"
            className="transition-all duration-1000"
          />
        </>
      )}

      {/* Body */}
      <ellipse
        cx="50"
        cy="60"
        rx={lerp(15, 16, t)}
        ry={lerp(14, 15, t)}
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="1.2"
      />
      {/* Chest marking */}
      <ellipse cx="50" cy="58" rx="7" ry="6" fill={WHITE} opacity="0.25" />

      {/* Head */}
      <circle
        cx="50"
        cy="36"
        r={lerp(14, 15, t)}
        fill={LIGHT_BLUE}
        stroke={BLUE}
        strokeWidth="1.2"
      />

      {/* Ears — tall and pointed */}
      <path d={`M 38 28 Q 30 10 42 22`} fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="1" />
      <path d={`M 62 28 Q 70 10 58 22`} fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="1" />
      <path d="M 39 27 Q 33 16 41 23" fill={PURPLE} opacity="0.3" />
      <path d="M 61 27 Q 67 16 59 23" fill={PURPLE} opacity="0.3" />

      {/* Crest/mane */}
      {stage >= 11 && (
        <>
          <path
            d={`M 44 24 Q 50 ${lerp(18, 12, (stage - 11) / 2)} 56 24`}
            fill={BLUE}
            opacity={lerp(0.4, 0.8, (stage - 11) / 2)}
            className="transition-all duration-1000"
          />
          <path
            d={`M 46 22 Q 50 ${lerp(16, 8, (stage - 11) / 2)} 54 22`}
            fill={PURPLE}
            opacity={lerp(0.3, 0.6, (stage - 11) / 2)}
            className="transition-all duration-1000"
          />
        </>
      )}

      {/* Eyes — sharper, more determined */}
      <circle cx="43" cy="34" r="4.5" fill={WHITE} />
      <circle cx="57" cy="34" r="4.5" fill={WHITE} />
      <circle cx="44" cy="34" r="2.8" fill={BLUE} />
      <circle cx="58" cy="34" r="2.8" fill={BLUE} />
      <circle cx="43" cy="33" r="1.2" fill={WHITE} opacity="0.9" />
      <circle cx="57" cy="33" r="1.2" fill={WHITE} opacity="0.9" />

      {/* Confident mouth */}
      <path
        d="M 46 41 Q 50 44 54 41"
        fill="none"
        stroke={DARK_BLUE}
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Arms — stronger */}
      <ellipse cx="33" cy="56" rx="5" ry="4" fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="0.8" />
      <ellipse cx="67" cy="56" rx="5" ry="4" fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="0.8" />

      {/* Feet */}
      <ellipse cx="42" cy="73" rx="5.5" ry="3" fill={BLUE} opacity="0.7" />
      <ellipse cx="58" cy="73" rx="5.5" ry="3" fill={BLUE} opacity="0.7" />

      {/* Forehead gem */}
      <polygon
        points="50,26 52,29 55,29 52.5,31 53.5,34 50,32.5 46.5,34 47.5,31 45,29 48,29"
        fill={GOLD}
        opacity="0.9"
      />

      {/* Sparkle particles */}
      {stage >= 12 &&
        SPARKLE_POSITIONS.slice(0, stage - 11).map((p) => (
          <circle
            key={`${p.x}-${p.y}`}
            cx={p.x}
            cy={p.y}
            r="1"
            fill={p.x > 50 ? PURPLE : BLUE}
            opacity="0.5"
            className={cn(animate && 'lyra-satellite')}
          />
        ))}
    </g>
  )
}

// ─── Mega (stages 14-16) ────────────────────────────────────────────────────

function Mega({ stage, uid, animate }: { stage: number; uid: string; animate: boolean }) {
  const t = (stage - 14) / 2

  return (
    <g>
      {/* Outer aura rings */}
      <circle
        cx="50"
        cy="50"
        r={lerp(40, 46, t)}
        fill="none"
        stroke={PURPLE}
        strokeWidth={lerp(0.5, 1, t)}
        opacity={lerp(0.15, 0.35, t)}
        className={cn('transition-all duration-1000', animate && 'lyra-ring1')}
        style={{ transformOrigin: '50px 50px' }}
      />
      <circle
        cx="50"
        cy="50"
        r={lerp(36, 42, t)}
        fill="none"
        stroke={BLUE}
        strokeWidth="0.5"
        opacity={lerp(0.1, 0.25, t)}
        className={cn('transition-all duration-1000', animate && 'lyra-ring2')}
        style={{ transformOrigin: '50px 50px' }}
      />

      {/* Crystal wing patterns */}
      <path
        d={`M 35 48 L ${lerp(15, 8, t)} ${lerp(32, 25, t)} L ${lerp(20, 14, t)} ${lerp(45, 40, t)} L 35 53 Z`}
        fill={PURPLE}
        opacity={lerp(0.3, 0.6, t)}
        stroke={LIGHT_BLUE}
        strokeWidth="0.5"
        className="transition-all duration-1000"
      />
      <path
        d={`M 65 48 L ${lerp(85, 92, t)} ${lerp(32, 25, t)} L ${lerp(80, 86, t)} ${lerp(45, 40, t)} L 65 53 Z`}
        fill={PURPLE}
        opacity={lerp(0.3, 0.6, t)}
        stroke={LIGHT_BLUE}
        strokeWidth="0.5"
        className="transition-all duration-1000"
      />
      {/* Lower wing segments */}
      <path
        d={`M 36 54 L ${lerp(18, 12, t)} ${lerp(55, 52, t)} L ${lerp(22, 16, t)} ${lerp(62, 60, t)} L 38 58 Z`}
        fill={BLUE}
        opacity={lerp(0.2, 0.4, t)}
        className="transition-all duration-1000"
      />
      <path
        d={`M 64 54 L ${lerp(82, 88, t)} ${lerp(55, 52, t)} L ${lerp(78, 84, t)} ${lerp(62, 60, t)} L 62 58 Z`}
        fill={BLUE}
        opacity={lerp(0.2, 0.4, t)}
        className="transition-all duration-1000"
      />

      {/* Flowing tail */}
      <path
        d={`M 62 60 Q 80 45 85 25 Q 88 18 84 15`}
        fill="none"
        stroke={PURPLE}
        strokeWidth="3.5"
        strokeLinecap="round"
        className={cn(animate && 'lyra-tendril-1')}
      />
      <circle
        cx="84"
        cy="15"
        r="4"
        fill={GOLD}
        opacity="0.8"
        filter={`url(#pk-blur-${uid})`}
        className={cn(animate && 'lyra-star-pulse')}
      />

      {/* Body */}
      <ellipse cx="50" cy="60" rx="16" ry="15" fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="1.5" />
      {/* Chest crystal pattern */}
      <path
        d="M 50 50 L 44 58 L 50 66 L 56 58 Z"
        fill={WHITE}
        opacity="0.2"
        stroke={BLUE}
        strokeWidth="0.5"
      />

      {/* Head */}
      <circle cx="50" cy="36" r="15" fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="1.5" />

      {/* Crown crest */}
      <path
        d={`M 42 24 L 38 ${lerp(12, 6, t)} L 44 18 L 50 ${lerp(10, 4, t)} L 56 18 L 62 ${lerp(12, 6, t)} L 58 24`}
        fill={GOLD}
        opacity={lerp(0.5, 0.9, t)}
        stroke={GOLD}
        strokeWidth="0.5"
        className="transition-all duration-1000"
      />

      {/* Ears */}
      <path d="M 37 28 Q 28 8 42 22" fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="1" />
      <path d="M 63 28 Q 72 8 58 22" fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="1" />
      <path d="M 38 27 Q 31 14 41 23" fill={PURPLE} opacity="0.4" />
      <path d="M 62 27 Q 69 14 59 23" fill={PURPLE} opacity="0.4" />

      {/* Eyes — glowing, powerful */}
      <circle cx="43" cy="34" r="5" fill={WHITE} />
      <circle cx="57" cy="34" r="5" fill={WHITE} />
      <circle cx="44" cy="34" r="3" fill={BLUE} />
      <circle cx="58" cy="34" r="3" fill={BLUE} />
      {/* Eye glow */}
      <circle cx="44" cy="34" r="5" fill={BLUE} opacity="0.15" filter={`url(#pk-blur-${uid})`} />
      <circle cx="58" cy="34" r="5" fill={BLUE} opacity="0.15" filter={`url(#pk-blur-${uid})`} />
      <circle cx="43" cy="33" r="1.3" fill={WHITE} opacity="0.95" />
      <circle cx="57" cy="33" r="1.3" fill={WHITE} opacity="0.95" />

      {/* Determined smile */}
      <path
        d="M 45 41 Q 50 45 55 41"
        fill="none"
        stroke={DARK_BLUE}
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Forehead mega gem */}
      <polygon
        points="50,25 52.5,28.5 56,29 53,31.5 54,35 50,33 46,35 47,31.5 44,29 47.5,28.5"
        fill={GOLD}
      />
      <circle cx="50" cy="30" r="2" fill={WHITE} opacity="0.4" filter={`url(#pk-blur-${uid})`} />

      {/* Arms */}
      <ellipse cx="32" cy="56" rx="5.5" ry="4" fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="1" />
      <ellipse cx="68" cy="56" rx="5.5" ry="4" fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="1" />

      {/* Feet */}
      <ellipse cx="42" cy="73" rx="6" ry="3" fill={BLUE} opacity="0.8" />
      <ellipse cx="58" cy="73" rx="6" ry="3" fill={BLUE} opacity="0.8" />

      {/* Floating sparkles */}
      {MEGA_SPARKLES.map((p) => (
        <circle
          key={`${p.x}-${p.y}`}
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill={p.color}
          opacity={lerp(0.3, 0.7, t)}
          className={cn(animate && 'lyra-satellite')}
        />
      ))}
    </g>
  )
}

// prettier-ignore
const SPARKLE_POSITIONS = [
  { x: 20, y: 25 },
  { x: 80, y: 30 },
  { x: 15, y: 55 },
  { x: 85, y: 60 },
  { x: 25, y: 78 },
  { x: 75, y: 82 },
]
// prettier-ignore
const MEGA_SPARKLES = [
  { x: 12, y: 20, r: 1.5, color: GOLD },
  { x: 88, y: 22, r: 1, color: PURPLE },
  { x: 8, y: 50, r: 1, color: BLUE },
  { x: 92, y: 48, r: 1.5, color: GOLD },
  { x: 15, y: 75, r: 1, color: PURPLE },
  { x: 85, y: 78, r: 1, color: BLUE },
  { x: 25, y: 12, r: 1, color: BLUE },
  { x: 75, y: 10, r: 1.5, color: GOLD },
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}
