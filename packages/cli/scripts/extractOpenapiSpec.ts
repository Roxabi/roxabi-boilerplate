#!/usr/bin/env bun
/**
 * Extract the V1 OpenAPI spec from the running API server.
 * Usage: bun packages/cli/scripts/extract-openapi-spec.ts [--api-url http://localhost:4000]
 *
 * Fetches /api/v1/docs-json and writes to packages/cli/openapi-v1.json.
 * Run this during development to update the spec. CI uses the committed spec
 * and verifies it hasn't drifted (contract test).
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = join(__dirname, '..', 'openapi-v1.json')

const apiUrl = process.argv.includes('--api-url')
  ? process.argv[process.argv.indexOf('--api-url') + 1]
  : 'http://localhost:4000'

async function main() {
  console.log(`Fetching OpenAPI spec from ${apiUrl}/api/v1/docs-json ...`)
  const response = await fetch(`${apiUrl}/api/v1/docs-json`)

  if (!response.ok) {
    console.error(`Failed to fetch spec: HTTP ${response.status}`)
    console.error('Make sure the API server is running with V1_SWAGGER_ENABLED=true')
    process.exit(1)
  }

  const spec = await response.json()
  writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`)
  console.log(`OpenAPI spec written to ${outputPath}`)
}

main()
