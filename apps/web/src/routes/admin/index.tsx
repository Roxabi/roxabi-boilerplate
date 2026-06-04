import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary'

export const Route = createFileRoute('/admin/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/members' })
  },
  errorComponent: ({ error }) => <AdminErrorBoundary error={error as Error} />,
})
