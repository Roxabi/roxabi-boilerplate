import { Button, Card, CardContent } from '@repo/ui'
import { AlertCircleIcon } from 'lucide-react'
import { m } from '@/paraglide/messages'

type AdminErrorBoundaryProps = {
  error: Error
  reset?: () => void
}

export function AdminErrorBoundary({ error, reset }: AdminErrorBoundaryProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <AlertCircleIcon className="size-10 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          {error instanceof Error ? error.message : m.auth_toast_error()}
        </p>
        {reset && (
          <Button variant="outline" onClick={reset}>
            {m.admin_error_retry()}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
