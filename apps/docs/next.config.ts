import { createMDX } from 'fumadocs-mdx/next'
import type { NextConfig } from 'next'

const withMDX = createMDX()

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
}

export default withMDX(config)
