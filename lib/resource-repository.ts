import "server-only"

import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm"

import { resourceAuditLogs, resourceCards, resourceLinks } from "@/lib/db-schema"
import { ensureSchema, getDb } from "@/lib/db"
import type {
  ResourceAuditAction,
  ResourceAuditActor,
  ResourceAuditLogEntry,
  ResourceCard,
  ResourceInput,
} from "@/lib/resources"

export class ResourceNotFoundError extends Error {
  constructor(id: string) {
    super(`Resource ${id} was not found.`)
    this.name = "ResourceNotFoundError"
  }
}

interface ResourceJoinRow {
  resourceId: string
  resourceCategory: string
  resourceDeletedAt: Date | string | null
  linkId: string | null
  linkUrl: string | null
  linkLabel: string | null
  linkNote: string | null
}

interface ResourceAuditJoinRow {
  logId: string
  logResourceId: string
  logAction: string
  logActorUserId: string | null
  logActorIdentifier: string
  logCreatedAt: Date | string
  resourceCategory: string
}

function normalizeTimestamp(value: Date | string | null): string | null {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return value
}

function normalizeAuditAction(value: string): ResourceAuditAction {
  return value === "restored" ? "restored" : "archived"
}

function normalizeAuditActor(actor?: ResourceAuditActor): {
  actorUserId: string | null
  actorIdentifier: string
} {
  const actorUserId = actor?.userId?.trim() || null
  const normalizedIdentifier = actor?.identifier?.trim().toLowerCase()
  const fallbackIdentifier = actorUserId ?? "unknown"

  return {
    actorUserId,
    actorIdentifier: (normalizedIdentifier || fallbackIdentifier).slice(0, 320),
  }
}

async function appendAuditLog(
  resourceId: string,
  action: ResourceAuditAction,
  actor?: ResourceAuditActor
) {
  const db = getDb()
  const { actorUserId, actorIdentifier } = normalizeAuditActor(actor)

  await db.insert(resourceAuditLogs).values({
    resourceId,
    action,
    actorUserId,
    actorIdentifier,
  })
}

function mapRowsToResources(rows: ResourceJoinRow[]): ResourceCard[] {
  const resourcesById = new Map<string, ResourceCard>()
  const orderedResources: ResourceCard[] = []

  for (const row of rows) {
    let resource = resourcesById.get(row.resourceId)

    if (!resource) {
      resource = {
        id: row.resourceId,
        category: row.resourceCategory,
        deletedAt: normalizeTimestamp(row.resourceDeletedAt),
        links: [],
      }
      resourcesById.set(row.resourceId, resource)
      orderedResources.push(resource)
    }

    if (row.linkId && row.linkUrl && row.linkLabel) {
      resource.links.push({
        id: row.linkId,
        url: row.linkUrl,
        label: row.linkLabel,
        note: row.linkNote,
      })
    }
  }

  return orderedResources
}

async function findResourceById(
  id: string,
  options: { includeDeleted: boolean }
): Promise<ResourceCard | null> {
  const db = getDb()

  const whereCondition = options.includeDeleted
    ? eq(resourceCards.id, id)
    : and(eq(resourceCards.id, id), isNull(resourceCards.deletedAt))

  const rows = await db
    .select({
      resourceId: resourceCards.id,
      resourceCategory: resourceCards.category,
      resourceDeletedAt: resourceCards.deletedAt,
      linkId: resourceLinks.id,
      linkUrl: resourceLinks.url,
      linkLabel: resourceLinks.label,
      linkNote: resourceLinks.note,
    })
    .from(resourceCards)
    .leftJoin(resourceLinks, eq(resourceCards.id, resourceLinks.resourceId))
    .where(whereCondition)
    .orderBy(asc(resourceLinks.position))

  const resources = mapRowsToResources(rows)
  return resources[0] ?? null
}

export async function hasAnyResources(): Promise<boolean> {
  await ensureSchema()
  const db = getDb()

  const rows = await db.select({ id: resourceCards.id }).from(resourceCards).limit(1)

  return rows.length > 0
}

export async function listResources(): Promise<ResourceCard[]> {
  await ensureSchema()
  const db = getDb()

  const rows = await db
    .select({
      resourceId: resourceCards.id,
      resourceCategory: resourceCards.category,
      resourceDeletedAt: resourceCards.deletedAt,
      linkId: resourceLinks.id,
      linkUrl: resourceLinks.url,
      linkLabel: resourceLinks.label,
      linkNote: resourceLinks.note,
    })
    .from(resourceCards)
    .leftJoin(resourceLinks, eq(resourceCards.id, resourceLinks.resourceId))
    .where(isNull(resourceCards.deletedAt))
    .orderBy(desc(resourceCards.createdAt), asc(resourceLinks.position))

  return mapRowsToResources(rows)
}

export async function listResourcesIncludingDeleted(): Promise<ResourceCard[]> {
  await ensureSchema()
  const db = getDb()

  const rows = await db
    .select({
      resourceId: resourceCards.id,
      resourceCategory: resourceCards.category,
      resourceDeletedAt: resourceCards.deletedAt,
      linkId: resourceLinks.id,
      linkUrl: resourceLinks.url,
      linkLabel: resourceLinks.label,
      linkNote: resourceLinks.note,
    })
    .from(resourceCards)
    .leftJoin(resourceLinks, eq(resourceCards.id, resourceLinks.resourceId))
    .orderBy(desc(resourceCards.createdAt), asc(resourceLinks.position))

  return mapRowsToResources(rows)
}

export async function listResourceAuditLogs(
  limit = 200
): Promise<ResourceAuditLogEntry[]> {
  await ensureSchema()
  const db = getDb()
  const boundedLimit = Math.max(1, Math.min(limit, 500))

  const rows = await db
    .select({
      logId: resourceAuditLogs.id,
      logResourceId: resourceAuditLogs.resourceId,
      logAction: resourceAuditLogs.action,
      logActorUserId: resourceAuditLogs.actorUserId,
      logActorIdentifier: resourceAuditLogs.actorIdentifier,
      logCreatedAt: resourceAuditLogs.createdAt,
      resourceCategory: resourceCards.category,
    })
    .from(resourceAuditLogs)
    .innerJoin(resourceCards, eq(resourceAuditLogs.resourceId, resourceCards.id))
    .orderBy(desc(resourceAuditLogs.createdAt))
    .limit(boundedLimit)

  return (rows as ResourceAuditJoinRow[]).map((row) => ({
    id: row.logId,
    resourceId: row.logResourceId,
    resourceCategory: row.resourceCategory,
    action: normalizeAuditAction(row.logAction),
    actorUserId: row.logActorUserId,
    actorIdentifier: row.logActorIdentifier,
    createdAt: normalizeTimestamp(row.logCreatedAt) ?? new Date(0).toISOString(),
  }))
}

export async function createResource(input: ResourceInput): Promise<ResourceCard> {
  await ensureSchema()
  const db = getDb()

  const insertedCards = await db
    .insert(resourceCards)
    .values({
      category: input.category,
    })
    .returning({
      id: resourceCards.id,
    })

  const createdCard = insertedCards[0]
  if (!createdCard) {
    throw new Error("Failed to create resource card.")
  }

  if (input.links.length > 0) {
    await db.insert(resourceLinks).values(
      input.links.map((link, position) => ({
        resourceId: createdCard.id,
        url: link.url,
        label: link.label,
        note: link.note ?? null,
        position,
      }))
    )
  }

  const resource = await findResourceById(createdCard.id, { includeDeleted: false })
  if (!resource) {
    throw new Error("Failed to read created resource card.")
  }

  return resource
}

export async function updateResource(
  id: string,
  input: ResourceInput
): Promise<ResourceCard> {
  await ensureSchema()
  const db = getDb()

  const updatedCards = await db
    .update(resourceCards)
    .set({
      category: input.category,
      updatedAt: sql`NOW()`,
    })
    .where(and(eq(resourceCards.id, id), isNull(resourceCards.deletedAt)))
    .returning({
      id: resourceCards.id,
    })

  if (updatedCards.length === 0) {
    throw new ResourceNotFoundError(id)
  }

  await db.delete(resourceLinks).where(eq(resourceLinks.resourceId, id))

  if (input.links.length > 0) {
    await db.insert(resourceLinks).values(
      input.links.map((link, position) => ({
        resourceId: id,
        url: link.url,
        label: link.label,
        note: link.note ?? null,
        position,
      }))
    )
  }

  const resource = await findResourceById(id, { includeDeleted: false })
  if (!resource) {
    throw new ResourceNotFoundError(id)
  }

  return resource
}

export async function deleteResource(
  id: string,
  actor?: ResourceAuditActor
): Promise<void> {
  await ensureSchema()
  const db = getDb()

  const rows = await db
    .update(resourceCards)
    .set({
      deletedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(and(eq(resourceCards.id, id), isNull(resourceCards.deletedAt)))
    .returning({ id: resourceCards.id })

  const archived = rows[0]
  if (!archived) {
    throw new ResourceNotFoundError(id)
  }

  await appendAuditLog(archived.id, "archived", actor)
}

export async function restoreResource(
  id: string,
  actor?: ResourceAuditActor
): Promise<ResourceCard> {
  await ensureSchema()
  const db = getDb()

  const rows = await db
    .update(resourceCards)
    .set({
      deletedAt: null,
      updatedAt: sql`NOW()`,
    })
    .where(and(eq(resourceCards.id, id), isNotNull(resourceCards.deletedAt)))
    .returning({ id: resourceCards.id })

  const restored = rows[0]
  if (!restored) {
    throw new ResourceNotFoundError(id)
  }

  await appendAuditLog(restored.id, "restored", actor)

  const resource = await findResourceById(id, { includeDeleted: false })
  if (!resource) {
    throw new ResourceNotFoundError(id)
  }

  return resource
}
