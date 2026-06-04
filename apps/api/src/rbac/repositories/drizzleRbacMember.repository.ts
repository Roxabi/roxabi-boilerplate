import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB, type DrizzleTx } from '../../database/drizzle.provider.js'
import { whereActive } from '../../database/helpers/whereActive.js'
import { members } from '../../database/schema/auth.schema.js'
import { roles } from '../../database/schema/rbac.schema.js'
import type { MemberRow, RbacMemberRepository, RoleRow } from '../rbacMember.repository.js'

@Injectable()
export class DrizzleRbacMemberRepository implements RbacMemberRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findDefaultRoles(
    tenantId: string,
    tx?: DrizzleTx
  ): Promise<{ id: string; slug: string }[]> {
    const qb = tx ?? this.db
    return qb
      .select({ id: roles.id, slug: roles.slug })
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.isDefault, true)))
  }

  async findMemberByUserAndOrg(
    userId: string,
    organizationId: string,
    roleId: string,
    tx: DrizzleTx
  ): Promise<{ id: string } | undefined> {
    const qb = tx ?? this.db
    const [member] = await qb
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.userId, userId),
          eq(members.organizationId, organizationId),
          eq(members.roleId, roleId),
          whereActive(members)
        )
      )
      .limit(1)
    return member
  }

  async findMemberByIdAndOrg(
    memberId: string,
    organizationId: string,
    roleId: string,
    tx: DrizzleTx
  ): Promise<{ id: string } | undefined> {
    const qb = tx ?? this.db
    const [member] = await qb
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.id, memberId),
          eq(members.organizationId, organizationId),
          eq(members.roleId, roleId),
          whereActive(members)
        )
      )
      .limit(1)
    return member
  }

  async updateMemberRole(memberId: string, roleId: string, tx?: DrizzleTx): Promise<void> {
    const qb = tx ?? this.db
    await qb
      .update(members)
      .set({ roleId })
      .where(and(eq(members.id, memberId), whereActive(members)))
  }

  async findRoleInTenant(
    roleId: string,
    tenantId: string,
    tx: DrizzleTx
  ): Promise<RoleRow | undefined> {
    const qb = tx ?? this.db
    const [role] = await qb
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
      .limit(1)
    return role
  }

  async findMemberInOrg(
    memberId: string,
    organizationId: string,
    tx: DrizzleTx
  ): Promise<MemberRow | undefined> {
    const qb = tx ?? this.db
    const [member] = await qb
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, memberId),
          eq(members.organizationId, organizationId),
          whereActive(members)
        )
      )
      .limit(1)
    return member
  }

  async findRoleById(roleId: string, tx?: DrizzleTx): Promise<RoleRow | undefined> {
    const qb = tx ?? this.db
    const [role] = await qb.select().from(roles).where(eq(roles.id, roleId)).limit(1)
    return role
  }

  async countMembersWithRole(
    organizationId: string,
    roleId: string,
    tx: DrizzleTx
  ): Promise<number> {
    const qb = tx ?? this.db
    const ownerMembers = await qb
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.organizationId, organizationId),
          eq(members.roleId, roleId),
          whereActive(members)
        )
      )
    return ownerMembers.length
  }
}
