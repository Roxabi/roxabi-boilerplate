import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { appName } from '@/lib/appName'
import { m } from '@/paraglide/messages'

type AccountDeletedSearch = {
  purgeDate?: string
  purged?: string
}

export const Route = createFileRoute('/account-deleted')({
  component: AccountDeletedPage,
  validateSearch: (search: Record<string, unknown>): AccountDeletedSearch => ({
    purgeDate: typeof search.purgeDate === 'string' ? search.purgeDate : undefined,
    purged: typeof search.purged === 'string' ? search.purged : undefined,
  }),
  head: () => ({
    meta: [{ title: `${m.account_deleted_scheduled_title()} | ${appName}` }],
  }),
})

function AccountDeletedPage() {
  const { purgeDate, purged } = useSearch({ from: '/account-deleted' })

  const isPurged = purged === 'true'
  const formattedDate = purgeDate ? new Date(purgeDate).toLocaleDateString() : null

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>
            {isPurged ? m.account_deleted_purged_title() : m.account_deleted_scheduled_title()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPurged ? (
            <p className="text-muted-foreground">{m.account_deleted_purged_desc()}</p>
          ) : (
            <>
              <p className="text-muted-foreground">
                {m.account_deleted_scheduled_desc()}
                {formattedDate
                  ? ` ${m.account_deleted_removed_on({ date: formattedDate })}`
                  : ` ${m.account_deleted_removed_grace()}`}
              </p>
              <p className="text-sm text-muted-foreground">{m.account_deleted_changed_mind()}</p>
            </>
          )}
          <Button variant="outline" asChild>
            <Link to="/login">
              {isPurged ? m.account_deleted_go_home() : m.account_deleted_back_to_login()}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
