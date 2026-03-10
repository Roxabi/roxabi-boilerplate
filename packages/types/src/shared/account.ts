export type OrgOwnershipResolution =
  | { organizationId: string; action: 'transfer'; transferToUserId: string }
  | { organizationId: string; action: 'delete' }

export type DeleteAccountPayload = {
  confirmEmail: string
  orgResolutions: OrgOwnershipResolution[]
}

export type AccountDeletionStatus = {
  deletedAt: string
  deleteScheduledFor: string
}

export type DeletionImpact = {
  memberCount: number
  invitationCount: number
  customRoleCount: number
}

export type DeleteOrgPayload = {
  confirmName: string
}
