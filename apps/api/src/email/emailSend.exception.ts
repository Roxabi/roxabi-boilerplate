export class EmailSendException extends Error {
  constructor(
    public readonly recipient: string,
    cause?: Error
  ) {
    super(`Failed to send email to ${recipient}`, { cause })
    this.name = 'EmailSendException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
