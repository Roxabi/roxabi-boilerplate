import { createFileRoute } from '@tanstack/react-router'
import { appName } from '@/lib/appName'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/design-system/')({
  head: () => ({
    meta: [{ title: `${m.ds_title()} | ${appName}` }],
  }),
})
