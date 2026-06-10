import { Button } from '@repo/ui'
import { useNavigate } from '@tanstack/react-router'
import { m } from '@/paraglide/messages'

function ErrorState({ error }: { error: string }) {
  const navigate = useNavigate()
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
      <p className="text-sm text-destructive">{error}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => navigate({ to: '.', reloadDocument: true })}
      >
        {m.api_keys_retry()}
      </Button>
    </div>
  )
}

export { ErrorState }
