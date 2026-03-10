import { Card, CardDescription, CardHeader, CardTitle, Separator } from '@repo/ui'
import { createFileRoute } from '@tanstack/react-router'
import { PrivacyDataSection } from '@/components/settings/PrivacyDataSection'
import { appName } from '@/lib/appName'
import { m } from '@/paraglide/messages'
import { EmailChangeSection, PasswordChangeSection, useIsOAuthOnly } from './-account-credentials'
import { DeleteAccountSection } from './-account-delete'

export const Route = createFileRoute('/settings/account')({
  component: AccountSettingsPage,
  head: () => ({
    meta: [{ title: m.account_head_title({ appName }) }],
  }),
})

function AccountSettingsPage() {
  const { isOAuthOnly, loading } = useIsOAuthOnly()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!isOAuthOnly && (
        <>
          <EmailChangeSection />
          <PasswordChangeSection />
        </>
      )}

      {isOAuthOnly && (
        <Card>
          <CardHeader>
            <CardTitle>{m.account_type_title()}</CardTitle>
            <CardDescription>{m.account_type_oauth_description()}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <PrivacyDataSection />

      <Separator />

      <DeleteAccountSection />
    </div>
  )
}
