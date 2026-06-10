import { eq, sql } from 'drizzle-orm'
import type { DrizzleDB, DrizzleTx } from '../database/drizzle.provider.js'
import { organizations } from '../database/schema/auth.schema.js'
import { OrgCycleDetectedException } from './exceptions/orgCycleDetected.exception.js'
import { OrgDepthExceededException } from './exceptions/orgDepthExceeded.exception.js'

export const MAX_PARENT_WALK_ITERATIONS = 10

/**
 * Get the depth of an org by walking up the parent chain.
 * Depth = number of ancestors (edges to root).
 */
export async function getDepth(db: DrizzleDB | DrizzleTx, orgId: string): Promise<number> {
  let depth = 0
  let iterations = 0
  let currentId: string | null = orgId
  while (currentId) {
    if (iterations++ >= MAX_PARENT_WALK_ITERATIONS) break
    const [org] = await db
      .select({ parentOrganizationId: organizations.parentOrganizationId })
      .from(organizations)
      .where(eq(organizations.id, currentId))
      .limit(1)
    if (!org) break
    currentId = org.parentOrganizationId
    if (currentId) depth++
  }
  return depth
}

/**
 * Validate hierarchy when reparenting: check for cycles and max depth.
 * Walks up from newParentId, checking each node.
 */
export async function validateHierarchy(
  db: DrizzleDB,
  orgId: string,
  newParentId: string
): Promise<void> {
  if (orgId === newParentId) {
    throw new OrgCycleDetectedException()
  }

  await db.transaction(async (tx) => {
    const { depth } = await walkParentChain(tx, orgId, newParentId)
    const subtreeDepth = await getSubtreeDepth(tx, orgId)

    if (depth + 1 + subtreeDepth >= 3) {
      throw new OrgDepthExceededException()
    }
  })
}

/**
 * Walk up from startId, counting depth and detecting cycles against targetOrgId.
 */
export async function walkParentChain(
  tx: DrizzleTx,
  targetOrgId: string,
  startId: string
): Promise<{ depth: number }> {
  let depth = 0
  let iterations = 0
  let currentId: string | null = startId
  const visited = new Set<string>()

  while (currentId) {
    if (iterations++ >= MAX_PARENT_WALK_ITERATIONS) break
    if (visited.has(currentId)) {
      throw new OrgCycleDetectedException()
    }
    visited.add(currentId)

    const [org] = await tx
      .select({
        id: organizations.id,
        parentOrganizationId: organizations.parentOrganizationId,
      })
      .from(organizations)
      .where(eq(organizations.id, currentId))
      .limit(1)
    if (!org) break

    currentId = org.parentOrganizationId
    if (currentId) depth++

    if (currentId === targetOrgId) {
      throw new OrgCycleDetectedException()
    }
  }

  return { depth }
}

/**
 * Get the depth of the deepest descendant below orgId using a recursive CTE.
 * Returns 0 if orgId has no children.
 */
export async function getSubtreeDepth(db: DrizzleDB | DrizzleTx, orgId: string): Promise<number> {
  const result = (await db.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id, parent_organization_id, 1 AS depth
      FROM organizations
      WHERE parent_organization_id = ${orgId}

      UNION ALL

      SELECT o.id, o.parent_organization_id, d.depth + 1
      FROM organizations o
      INNER JOIN descendants d ON o.parent_organization_id = d.id
      WHERE d.depth < ${MAX_PARENT_WALK_ITERATIONS}
    )
    SELECT MAX(depth) AS max_depth FROM descendants
  `)) as Array<{ max_depth: number | null }>

  return result[0]?.max_depth ?? 0
}

/**
 * Collect all descendant org IDs recursively using a recursive CTE.
 */
export async function getDescendantOrgIds(
  db: DrizzleDB | DrizzleTx,
  orgId: string
): Promise<string[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id, parent_organization_id, 1 AS depth
      FROM organizations
      WHERE parent_organization_id = ${orgId}

      UNION ALL

      SELECT o.id, o.parent_organization_id, d.depth + 1
      FROM organizations o
      INNER JOIN descendants d ON o.parent_organization_id = d.id
      WHERE d.depth < ${MAX_PARENT_WALK_ITERATIONS}
    )
    SELECT id FROM descendants
    LIMIT 1000
  `)

  const rows = result as unknown as Array<{ id: string }>
  return rows.map((r) => r.id)
}
