import { loader } from 'fumadocs-core/source'
import { createMDXSource } from 'fumadocs-mdx'
import { docs } from '@/.source'

// createMDXSource gives proper generic types (body, toc, etc.) for page.data inference.
// fumadocs-mdx@11 returns `files` as a lazy function at runtime; fumadocs-core@15 requires
// a plain array. Unwrap it here.
const _mdxSource = createMDXSource(docs.docs, docs.meta)
type SourceFiles = (typeof _mdxSource)['files']
// @ts-expect-error — files is a function at runtime despite being typed as VirtualFile[]
const files: SourceFiles = _mdxSource.files()

export const source = loader({
  baseUrl: '/docs',
  source: { ..._mdxSource, files },
})
