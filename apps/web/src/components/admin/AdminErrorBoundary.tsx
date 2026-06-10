import { Button } from '@repo/ui'
import { useRouter } from '@tanstack/react-router'
import { m } from '@/paraglide/messages'

export function AdminErrorBoundary({ error }: { error: Error }) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <h2 className="text-lg font-semibold">{m.admin_error_boundary_title()}</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || m.admin_error_boundary_detail()}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.history.back()}>
          {m.admin_error_boundary_go_back()}
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.invalidate()}>
          {m.admin_error_boundary_retry()}
        </Button>
      </div>
    </div>
  )
}
