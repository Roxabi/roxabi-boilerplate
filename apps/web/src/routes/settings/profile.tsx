import { createFileRoute } from '@tanstack/react-router'
import { appName } from '@/lib/appName'

export const Route = createFileRoute('/settings/profile')({
  head: () => ({
    meta: [{ title: `Profile Settings | ${appName}` }],
  }),
})
