import { BadRequestException, type PipeTransform } from '@nestjs/common'
import { ZodType } from 'zod'

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors)
    }
    return result.data
  }
}
