import { useInView, useReducedMotion } from '@repo/ui'

type UseSlideRevealOptions = {
  threshold?: number
}

/**
 * Manual animation control for presentation sections.
 * Unlike AnimatedSection's implicit scroll-triggered reveal, this hook
 * exposes a `visible` boolean so components can drive their own staggered animations.
 */
export function useSlideReveal(options?: UseSlideRevealOptions) {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ threshold: options?.threshold ?? 0.3, triggerOnce: true })
  const visible = inView || reducedMotion

  return { ref, visible, reducedMotion }
}
