import { Button } from '@repo/ui'
import { useRouter } from '@tanstack/react-router'

export function AdminErrorBoundary({ error }: { error: Error }) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.history.back()}>
          Go back
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.invalidate()}>
          Try again
        </Button>
      </div>
    </div>
  )
}
