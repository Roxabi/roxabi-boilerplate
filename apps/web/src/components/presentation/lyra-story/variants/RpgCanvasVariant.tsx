import { cn, useReducedMotion } from '@repo/ui'
import { useCallback, useEffect, useRef } from 'react'

type RpgCanvasVariantProps = {
  stage: number
  size: number
  className?: string
}

// Colors
const SKIN = '#e0c8a8'
const HAIR = '#2D7FF9'
const DARK = '#1a1a3e'
const BLUE = '#2D7FF9'
const PURPLE = '#8B5CF6'
const GOLD = '#ffd700'
const SILVER = '#c0c0c0'

// 16x16 grid sprite frames — each is an array of [x, y, color] tuples
type Pixel = [number, number, string]

function getCharacterPixels(stage: number): Pixel[] {
  const pixels: Pixel[] = []

  if (stage === 0) {
    pixels.push([8, 9, BLUE])
    return pixels
  }

  if (stage === 1) {
    pixels.push([8, 8, BLUE], [7, 9, PURPLE], [9, 9, PURPLE])
    return pixels
  }

  if (stage === 2) {
    pixels.push(
      [7, 7, BLUE],
      [8, 7, BLUE],
      [9, 7, BLUE],
      [7, 8, BLUE],
      [8, 8, '#ff4444'],
      [9, 8, BLUE],
      [7, 9, BLUE],
      [8, 9, BLUE],
      [9, 9, BLUE]
    )
    return pixels
  }

  // Base character (stage 3+)
  // Head
  for (let x = 7; x <= 10; x++) for (let y = 3; y <= 6; y++) pixels.push([x, y, SKIN])
  // Eyes
  pixels.push([8, 4, DARK], [10, 4, DARK])
  // Body
  for (let x = 7; x <= 10; x++) for (let y = 7; y <= 10; y++) pixels.push([x, y, BLUE])
  // Legs
  for (let y = 11; y <= 13; y++) {
    pixels.push([7, y, DARK], [8, y, DARK], [9, y, DARK], [10, y, DARK])
  }

  if (stage >= 4) pixels.push([8, 5, '#c89878'], [9, 5, '#c89878'])
  if (stage >= 5) {
    pixels.push([5, 7, SKIN], [6, 7, SKIN], [11, 7, SKIN], [12, 7, SKIN])
    pixels.push([5, 8, SKIN], [5, 9, SKIN], [12, 8, SKIN], [12, 9, SKIN])
  }
  if (stage >= 6) {
    pixels.push([8, 8, '#1e5fc2'], [9, 8, '#1e5fc2'], [8, 9, '#1e5fc2'], [9, 9, '#1e5fc2'])
  }
  if (stage >= 7) {
    for (let y = 4; y <= 11; y++) pixels.push([6, y, PURPLE])
    for (let y = 4; y <= 11; y++) pixels.push([11, y, PURPLE])
    pixels.push([5, 11, PURPLE], [6, 12, PURPLE], [11, 11, PURPLE], [12, 12, PURPLE])
  }
  if (stage >= 8) {
    pixels.push([7, 2, HAIR], [8, 2, HAIR], [9, 2, HAIR], [10, 2, HAIR])
    pixels.push([6, 3, HAIR], [6, 4, HAIR], [11, 3, HAIR], [11, 4, HAIR])
  }
  if (stage >= 9) {
    pixels.push([7, 1, GOLD], [9, 1, GOLD], [8, 0, GOLD], [9, 0, GOLD], [10, 1, GOLD])
  }
  if (stage >= 10) {
    pixels.push([8, 4, BLUE], [10, 4, BLUE])
  }
  if (stage >= 11) {
    pixels.push([2, 5, BLUE], [15, 5, PURPLE], [2, 12, PURPLE])
  }
  if (stage >= 12) {
    pixels.push(
      [13, 5, SILVER],
      [13, 6, SILVER],
      [13, 7, '#a0a0a0'],
      [13, 8, '#a0a0a0'],
      [13, 9, '#a0a0a0'],
      [12, 7, GOLD],
      [14, 7, GOLD]
    )
  }
  if (stage >= 13) {
    pixels.push(
      [3, 7, BLUE],
      [4, 7, BLUE],
      [3, 8, BLUE],
      [4, 8, '#1e5fc2'],
      [3, 9, BLUE],
      [4, 9, '#1e5fc2'],
      [4, 8, GOLD]
    )
  }
  if (stage >= 14) {
    pixels.push([6, 0, GOLD], [11, 0, GOLD], [4, 2, GOLD], [13, 2, GOLD])
  }
  if (stage >= 16) {
    pixels.push([6, 13, '#4a2800'], [7, 13, '#4a2800'], [10, 13, '#4a2800'], [11, 13, '#4a2800'])
    pixels.push([8, 5, '#ff9999'], [9, 5, '#ff9999'])
  }

  return pixels
}

export function RpgCanvasVariant({ stage, size, className }: RpgCanvasVariantProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const reducedMotion = useReducedMotion()

  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const w = 18
      const h = 18
      canvas.width = w * dpr * (size / 18)
      canvas.height = h * dpr * (size / 18)
      ctx.setTransform(dpr * (size / 18), 0, 0, dpr * (size / 18), 0, 0)

      ctx.clearRect(0, 0, w, h)
      ctx.imageSmoothingEnabled = false

      // Idle bounce (2-frame animation)
      const bounce = !reducedMotion && stage >= 3 ? (Math.sin(timestamp / 400) > 0.3 ? -0.5 : 0) : 0

      // Glitch offset for stage 2
      const glitchX = stage === 2 && !reducedMotion ? Math.sin(timestamp / 50) * 0.5 : 0

      const pixels = getCharacterPixels(stage)

      ctx.save()
      ctx.translate(glitchX, bounce)

      for (const [x, y, color] of pixels) {
        ctx.fillStyle = color
        ctx.fillRect(x, y, 1, 1)
      }

      ctx.restore()

      // XP bar
      if (stage >= 3) {
        const t = stage / 16
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(1, 16, 16, 1)
        ctx.fillStyle = BLUE
        ctx.fillRect(1, 16, 16 * t, 1)
      }

      frameRef.current = requestAnimationFrame(draw)
    },
    [stage, size, reducedMotion]
  )

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameRef.current)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className={cn('transition-all duration-500', className)}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
      }}
      role="img"
    />
  )
}
