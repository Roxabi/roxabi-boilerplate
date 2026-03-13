#!/usr/bin/env node

import { Command } from 'commander'
import { authCommand } from './commands/auth.js'
import { invitationsCommand } from './commands/invitations.js'
import { membersCommand } from './commands/members.js'
import { orgsCommand } from './commands/orgs.js'
import { rolesCommand } from './commands/roles.js'
import { usersCommand } from './commands/users.js'

const program = new Command()

program.name('roxabi').description('Roxabi CLI — interact with the Roxabi API').version('0.1.0')

program.addCommand(authCommand())
program.addCommand(usersCommand())
program.addCommand(orgsCommand())
program.addCommand(membersCommand())
program.addCommand(rolesCommand())
program.addCommand(invitationsCommand())

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'An unexpected error occurred')
  process.exit(1)
})
