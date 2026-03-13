import { Command } from 'commander'
import { createClient } from '../lib/client.js'
import { clearCredentials, loadCredentials, saveCredentials } from '../lib/credentials.js'

const DEFAULT_API_URL = 'http://localhost:4000'

export function authCommand(): Command {
  const auth = new Command('auth').description('Manage authentication')

  auth
    .command('login')
    .description('Authenticate with an API token')
    .requiredOption('--token <token>', 'API key (sk_live_xxx)')
    .option('--api-url <url>', 'API base URL', DEFAULT_API_URL)
    .action(async (opts: { token: string; apiUrl: string }) => {
      const { token, apiUrl } = opts

      // Validate the token by calling /api/v1/users/me
      const client = createClient(apiUrl, token)
      try {
        const user = await client.get<{ name: string; email: string | null }>('/api/v1/users/me')
        saveCredentials({ token, apiUrl })
        console.log(`Authenticated as ${user.name}${user.email ? ` (${user.email})` : ''}`)
        console.log(`Credentials saved.`)
      } catch (error) {
        console.error(
          'Authentication failed:',
          error instanceof Error ? error.message : 'Unknown error'
        )
        process.exit(1)
      }
    })

  auth
    .command('logout')
    .description('Remove stored credentials')
    .action(() => {
      clearCredentials()
      console.log('Credentials removed.')
    })

  auth
    .command('status')
    .description('Show current authentication status')
    .action(() => {
      const creds = loadCredentials()
      if (creds) {
        const masked = `${creds.token.slice(0, 10)}...${creds.token.slice(-4)}`
        console.log(`Authenticated`)
        console.log(`  API URL: ${creds.apiUrl}`)
        console.log(`  Token:   ${masked}`)
      } else {
        console.log('Not authenticated. Run `roxabi auth login --token <token>` to authenticate.')
      }
    })

  return auth
}
