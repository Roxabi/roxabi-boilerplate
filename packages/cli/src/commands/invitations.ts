import { Command } from 'commander'
import { createClient } from '../lib/client.js'
import type { OutputOptions } from '../lib/output.js'
import { printJson, printTable } from '../lib/output.js'

interface InvitationResponse {
  id: string
  email: string
  role: string
  status: string
  invitedAt: string
  expiresAt: string | null
}

export function invitationsCommand(): Command {
  const invitations = new Command('invitations').description('Invitation operations')

  invitations
    .command('list')
    .description('List pending invitations for the current organization')
    .option('--json', 'Output as JSON')
    .action(async (opts: OutputOptions) => {
      const client = createClient()
      const data = await client.get<InvitationResponse[]>('/api/v1/invitations')

      if (opts.json) {
        printJson(data)
      } else {
        printTable(data, [
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Role' },
          { key: 'status', header: 'Status' },
          { key: 'invitedAt', header: 'Invited' },
          { key: 'expiresAt', header: 'Expires' },
        ])
      }
    })

  return invitations
}
