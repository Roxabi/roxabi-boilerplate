import type { OrgDeletionImpact } from '@repo/types'

type ImpactSummaryProps = {
  orgName: string
  impact: OrgDeletionImpact
}

export function ImpactSummary({ orgName, impact }: ImpactSummaryProps) {
  const childMsg = `${impact.childMemberCount} member${impact.childMemberCount !== 1 ? 's' : ''} across ${impact.childOrgCount} child org${impact.childOrgCount !== 1 ? 's' : ''} will be affected`

  return (
    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
      <p>
        This will archive <strong>{orgName}</strong>.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>
          {impact.memberCount} member{impact.memberCount !== 1 ? 's' : ''} will be affected
        </li>
        {impact.childOrgCount > 0 && <li>{childMsg}</li>}
      </ul>
    </div>
  )
}
