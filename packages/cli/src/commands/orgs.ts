import { Command } from 'commander'
import { createClient } from '../lib/client.js'
import type { OutputOptions } from '../lib/output.js'
import { printJson, printTable } from '../lib/output.js'

interface OrgResponse {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: string
}

export function orgsCommand(): Command {
  const orgs = new Command('orgs').description('Organization operations')

  orgs
    .command('get')
    .description('List organizations for the authenticated user')
    .option('--json', 'Output as JSON')
    .action(async (opts: OutputOptions) => {
      const client = createClient()
      const data = await client.get<OrgResponse[]>('/api/v1/organizations')

      if (opts.json) {
        printJson(data)
      } else {
        printTable(data, [
          { key: 'id', header: 'ID' },
          { key: 'name', header: 'Name' },
          { key: 'slug', header: 'Slug' },
          { key: 'createdAt', header: 'Created' },
        ])
      }
    })

  return orgs
}
