import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/profile')({
  head: () => ({
    meta: [{ title: 'Profile Settings | Roxabi' }],
  }),
})
