import "server-only"

import { loadLibraryResourcesFromFile } from "@/lib/library-parser"
import type {
  ResourceAuditAction,
  ResourceAuditActor,
  ResourceAuditLogEntry,
  ResourceCard,
  ResourceInput,
} from "@/lib/resources"
import { ResourceNotFoundError } from "@/lib/resource-repository"

let mockStore: ResourceCard[] | null = null
let mockAuditLogs: ResourceAuditLogEntry[] | null = null

function cloneResource(resource: ResourceCard): ResourceCard {
  return {
    id: resource.id,
    category: resource.category,
    deletedAt: resource.deletedAt ?? null,
    links: resource.links.map((link) => ({ ...link })),
  }
}

function cloneAuditLog(log: ResourceAuditLogEntry): ResourceAuditLogEntry {
  return {
    ...log,
  }
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

function ensureMockStore() {
  if (mockStore === null) {
    mockStore = loadLibraryResourcesFromFile().map((resource) => ({
      ...resource,
      deletedAt: resource.deletedAt ?? null,
    }))
  }

  if (mockAuditLogs === null) {
    mockAuditLogs = []
  }
}

function appendMockAuditLog(
  resource: ResourceCard,
  action: ResourceAuditAction,
  actor?: ResourceAuditActor
) {
  const { actorUserId, actorIdentifier } = normalizeAuditActor(actor)
  const next: ResourceAuditLogEntry = {
    id: crypto.randomUUID(),
    resourceId: resource.id,
    resourceCategory: resource.category,
    action,
    actorUserId,
    actorIdentifier,
    createdAt: new Date().toISOString(),
  }

  mockAuditLogs = [next, ...(mockAuditLogs ?? [])]
}

export function resetMockStoreForTests() {
  mockStore = null
  mockAuditLogs = null
}

export async function hasAnyMockResources(): Promise<boolean> {
  ensureMockStore()
  return (mockStore ?? []).length > 0
}

export async function listMockResources(): Promise<ResourceCard[]> {
  ensureMockStore()
  return (mockStore ?? [])
    .filter((resource) => !resource.deletedAt)
    .map(cloneResource)
}

export async function listMockResourcesIncludingDeleted(): Promise<ResourceCard[]> {
  ensureMockStore()
  return (mockStore ?? []).map(cloneResource)
}

export async function listMockResourceAuditLogs(
  limit = 200
): Promise<ResourceAuditLogEntry[]> {
  ensureMockStore()
  const boundedLimit = Math.max(1, Math.min(limit, 500))

  return (mockAuditLogs ?? []).slice(0, boundedLimit).map(cloneAuditLog)
}

export async function createMockResource(input: ResourceInput): Promise<ResourceCard> {
  ensureMockStore()

  const created: ResourceCard = {
    id: crypto.randomUUID(),
    category: input.category,
    deletedAt: null,
    links: input.links.map((link) => ({
      id: crypto.randomUUID(),
      url: link.url,
      label: link.label,
      note: link.note,
    })),
  }

  mockStore = [created, ...(mockStore ?? [])]
  return cloneResource(created)
}

export async function updateMockResource(
  id: string,
  input: ResourceInput
): Promise<ResourceCard> {
  ensureMockStore()

  const index = (mockStore ?? []).findIndex(
    (resource) => resource.id === id && !resource.deletedAt
  )

  if (index < 0) {
    throw new ResourceNotFoundError(id)
  }

  const previous = (mockStore ?? [])[index]

  const updated: ResourceCard = {
    id,
    category: input.category,
    deletedAt: previous.deletedAt ?? null,
    links: input.links.map((link) => ({
      id: crypto.randomUUID(),
      url: link.url,
      label: link.label,
      note: link.note,
    })),
  }

  const next = [...(mockStore ?? [])]
  next[index] = updated
  mockStore = next

  return cloneResource(updated)
}

export async function deleteMockResource(
  id: string,
  actor?: ResourceAuditActor
): Promise<void> {
  ensureMockStore()

  const index = (mockStore ?? []).findIndex(
    (resource) => resource.id === id && !resource.deletedAt
  )

  if (index < 0) {
    throw new ResourceNotFoundError(id)
  }

  const next = [...(mockStore ?? [])]
  next[index] = {
    ...next[index],
    deletedAt: new Date().toISOString(),
  }
  mockStore = next

  appendMockAuditLog(next[index], "archived", actor)
}

export async function restoreMockResource(
  id: string,
  actor?: ResourceAuditActor
): Promise<ResourceCard> {
  ensureMockStore()

  const index = (mockStore ?? []).findIndex(
    (resource) => resource.id === id && Boolean(resource.deletedAt)
  )

  if (index < 0) {
    throw new ResourceNotFoundError(id)
  }

  const next = [...(mockStore ?? [])]
  next[index] = {
    ...next[index],
    deletedAt: null,
  }
  mockStore = next

  appendMockAuditLog(next[index], "restored", actor)

  return cloneResource(next[index])
}
