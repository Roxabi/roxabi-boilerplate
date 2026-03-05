import { useInView, useReducedMotion } from '@repo/ui'

type UseSlideRevealOptions = {
  threshold?: number
}

export function useSlideReveal(options?: UseSlideRevealOptions) {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ threshold: options?.threshold ?? 0.3, triggerOnce: true })
  const visible = inView || reducedMotion

  return { ref, visible, reducedMotion }
}
