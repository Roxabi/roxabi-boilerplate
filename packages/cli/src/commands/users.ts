import { Command } from 'commander'
import { createClient } from '../lib/client.js'
import type { OutputOptions } from '../lib/output.js'
import { printJson, printSingle } from '../lib/output.js'

interface UserMeResponse {
  id: string
  name: string
  email: string | null
  image: string | null
}

export function usersCommand(): Command {
  const users = new Command('users').description('User operations')

  users
    .command('me')
    .description('Get the current authenticated user profile')
    .option('--json', 'Output as JSON')
    .action(async (opts: OutputOptions) => {
      const client = createClient()
      const user = await client.get<UserMeResponse>('/api/v1/users/me')

      if (opts.json) {
        printJson(user)
      } else {
        printSingle(user, [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'image', label: 'Image' },
        ])
      }
    })

  return users
}
