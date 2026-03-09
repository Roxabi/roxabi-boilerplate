import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

const config = {
  reactStrictMode: true,
  output: 'standalone',
}

export default withMDX(config)
