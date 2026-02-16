import "server-only"

import { loadLibraryResourcesFromFile } from "@/lib/library-parser"
import type {
  ResourceCategory,
  ResourceAuditAction,
  ResourceAuditActor,
  ResourceAuditLogEntry,
  ResourceCard,
  ResourceInput,
} from "@/lib/resources"
import { DEFAULT_CATEGORY_SUGGESTIONS } from "@/lib/resources"
import {
  ResourceCategoryAlreadyExistsError,
  ResourceCategoryNotFoundError,
  ResourceNotFoundError,
} from "@/lib/resource-repository"

let mockStore: ResourceCard[] | null = null
let mockAuditLogs: ResourceAuditLogEntry[] | null = null
let mockCategories: ResourceCategory[] | null = null

const DEFAULT_RESOURCE_CATEGORY_NAME = "General"
const FALLBACK_RESOURCE_CATEGORY_NAME = "Uncategorized"

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

function cloneCategory(category: ResourceCategory): ResourceCategory {
  return {
    ...category,
  }
}

function normalizeCategoryName(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function ensureMockCategoryByName(name: string): ResourceCategory {
  const normalizedName = normalizeCategoryName(name)
  if (!normalizedName) {
    throw new Error("Category name is required.")
  }

  const existing = (mockCategories ?? []).find(
    (category) => category.name.toLowerCase() === normalizedName.toLowerCase()
  )
  if (existing) {
    return existing
  }

  const nextCategory: ResourceCategory = {
    id: crypto.randomUUID(),
    name: normalizedName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockCategories = [...(mockCategories ?? []), nextCategory]
  return nextCategory
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

  if (mockCategories === null) {
    const seedNames = new Set<string>([
      DEFAULT_RESOURCE_CATEGORY_NAME,
      ...DEFAULT_CATEGORY_SUGGESTIONS,
      ...(mockStore ?? []).map((resource) => resource.category),
    ])

    mockCategories = [...seedNames]
      .map((name) => normalizeCategoryName(name))
      .filter((name) => name.length > 0)
      .map((name) => ({
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
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
  mockCategories = null
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

export async function listMockResourceCategories(): Promise<ResourceCategory[]> {
  ensureMockStore()

  return [...(mockCategories ?? [])]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(cloneCategory)
}

export async function createMockResourceCategory(
  name: string
): Promise<ResourceCategory> {
  ensureMockStore()

  const normalizedName = normalizeCategoryName(name)
  const existing = (mockCategories ?? []).find(
    (category) => category.name.toLowerCase() === normalizedName.toLowerCase()
  )
  if (existing) {
    throw new ResourceCategoryAlreadyExistsError(normalizedName)
  }

  const created = ensureMockCategoryByName(normalizedName)
  return cloneCategory(created)
}

export async function deleteMockResourceCategory(categoryId: string): Promise<{
  deletedCategory: ResourceCategory
  reassignedCategory: ResourceCategory
  reassignedResources: number
}> {
  ensureMockStore()

  const existing = (mockCategories ?? []).find(
    (category) => category.id === categoryId
  )
  if (!existing) {
    throw new ResourceCategoryNotFoundError(categoryId)
  }

  const fallbackName =
    existing.name.toLowerCase() === DEFAULT_RESOURCE_CATEGORY_NAME.toLowerCase()
      ? FALLBACK_RESOURCE_CATEGORY_NAME
      : DEFAULT_RESOURCE_CATEGORY_NAME
  const reassignedCategory = ensureMockCategoryByName(fallbackName)

  let reassignedResources = 0
  mockStore = (mockStore ?? []).map((resource) => {
    if (resource.category.toLowerCase() !== existing.name.toLowerCase()) {
      return resource
    }

    reassignedResources += 1
    return {
      ...resource,
      category: reassignedCategory.name,
    }
  })

  mockCategories = (mockCategories ?? []).filter(
    (category) => category.id !== categoryId
  )

  return {
    deletedCategory: cloneCategory(existing),
    reassignedCategory: cloneCategory(reassignedCategory),
    reassignedResources,
  }
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
  const category = ensureMockCategoryByName(input.category)

  const created: ResourceCard = {
    id: crypto.randomUUID(),
    category: category.name,
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
  const category = ensureMockCategoryByName(input.category)

  const index = (mockStore ?? []).findIndex(
    (resource) => resource.id === id && !resource.deletedAt
  )

  if (index < 0) {
    throw new ResourceNotFoundError(id)
  }

  const previous = (mockStore ?? [])[index]

  const updated: ResourceCard = {
    id,
    category: category.name,
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
