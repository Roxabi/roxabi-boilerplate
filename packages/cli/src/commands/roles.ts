import { Command } from 'commander'
import { createClient } from '../lib/client.js'
import type { OutputOptions } from '../lib/output.js'
import { printJson, printTable } from '../lib/output.js'

interface RoleResponse {
  id: string
  name: string
  description: string | null
  permissions: string[]
}

export function rolesCommand(): Command {
  const roles = new Command('roles').description('Role operations')

  roles
    .command('list')
    .description('List roles for the current organization')
    .option('--json', 'Output as JSON')
    .action(async (opts: OutputOptions) => {
      const client = createClient()
      const data = await client.get<RoleResponse[]>('/api/v1/roles')

      if (opts.json) {
        printJson(data)
      } else {
        printTable(
          data.map((r) => ({
            ...r,
            permissions: r.permissions.join(', '),
          })),
          [
            { key: 'name', header: 'Name' },
            { key: 'description', header: 'Description' },
            { key: 'permissions', header: 'Permissions' },
          ]
        )
      }
    })

  return roles
}
