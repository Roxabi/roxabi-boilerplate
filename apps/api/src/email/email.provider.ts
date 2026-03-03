export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER')

export type EmailProvider = {
  send(params: { to: string; subject: string; html: string; text?: string }): Promise<void>
}
