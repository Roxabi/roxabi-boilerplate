import { Command } from 'commander'
import { createClient } from '../lib/client.js'
import type { OutputOptions } from '../lib/output.js'
import { printJson, printTable } from '../lib/output.js'

interface MemberResponse {
  id: string
  userId: string
  name: string
  email: string
  role: string
  joinedAt: string
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export function membersCommand(): Command {
  const members = new Command('members').description('Member operations')

  members
    .command('list')
    .description('List members of the active organization')
    .option('--json', 'Output as JSON')
    .option('--page <page>', 'Page number', '1')
    .option('--limit <limit>', 'Items per page', '20')
    .option('--search <query>', 'Search by name or email')
    .action(async (opts: OutputOptions & { page: string; limit: string; search?: string }) => {
      const client = createClient()
      const params: Record<string, string> = {
        page: opts.page,
        limit: opts.limit,
      }
      if (opts.search) params.search = opts.search

      const result = await client.get<PaginatedResponse<MemberResponse>>('/api/v1/members', params)

      if (opts.json) {
        printJson(result)
      } else {
        printTable(result.data, [
          { key: 'name', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Role' },
          { key: 'joinedAt', header: 'Joined' },
        ])
        console.log(`\nPage ${result.page} — ${result.total} total members`)
      }
    })

  return members
}
