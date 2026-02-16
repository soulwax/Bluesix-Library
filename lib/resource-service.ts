import "server-only"

import { ensureSuperAdminSeeded } from "@/lib/auth-service"
import { hasDatabaseEnv } from "@/lib/env"
import { loadLibraryResourcesFromFile } from "@/lib/library-parser"
import {
  createMockResourceCategory,
  createMockResource,
  deleteMockResourceCategory,
  deleteMockResource,
  hasAnyMockResources,
  listMockResourceCategories,
  listMockResourceAuditLogs,
  listMockResourcesIncludingDeleted,
  listMockResources,
  updateMockResourceCategorySymbol,
  restoreMockResource,
  updateMockResource,
} from "@/lib/mock-resource-store"
import {
  createResourceCategory as createDbResourceCategory,
  createResource as createDbResource,
  deleteResourceCategory as deleteDbResourceCategory,
  deleteResource as deleteDbResource,
  hasAnyResources as hasAnyDbResources,
  listResourceCategories as listDbResourceCategories,
  listResourceAuditLogs as listDbResourceAuditLogs,
  listResourcesIncludingDeleted as listDbResourcesIncludingDeleted,
  listResources as listDbResources,
  updateResourceCategorySymbol as updateDbResourceCategorySymbol,
  restoreResource as restoreDbResource,
  updateResource as updateDbResource,
} from "@/lib/resource-repository"
import type {
  ResourceAuditActor,
  ResourceAuditLogEntry,
  ResourceCard,
  ResourceCategory,
  ResourceInput,
} from "@/lib/resources"

export type ResourceDataMode = "database" | "mock"

let databaseBootstrap: Promise<void> | null = null

function currentMode(): ResourceDataMode {
  return hasDatabaseEnv() ? "database" : "mock"
}

function toResourceInput(resource: ResourceCard): ResourceInput {
  return {
    category: resource.category,
    tags: resource.tags ?? [],
    links: resource.links.map((link) => ({
      url: link.url,
      label: link.label,
      note: link.note ?? undefined,
    })),
  }
}

async function ensureDatabaseBootstrapped() {
  if (databaseBootstrap !== null) {
    await databaseBootstrap
    return
  }

  databaseBootstrap = (async () => {
    await ensureSuperAdminSeeded()

    const hasExistingResources = await hasAnyDbResources()
    if (hasExistingResources) {
      return
    }

    const libraryResources = loadLibraryResourcesFromFile()
    if (libraryResources.length === 0) {
      return
    }

    for (const resource of libraryResources) {
      await createDbResource(toResourceInput(resource))
    }
  })()

  try {
    await databaseBootstrap
  } catch (error) {
    databaseBootstrap = null
    throw error
  }
}

export async function listResourcesService(): Promise<{
  mode: ResourceDataMode
  resources: ResourceCard[]
}> {
  const mode = currentMode()

  if (mode === "database") {
    await ensureDatabaseBootstrapped()

    return {
      mode,
      resources: await listDbResources(),
    }
  }

  return {
    mode,
    resources: await listMockResources(),
  }
}

export async function listResourceCategoriesService(): Promise<{
  mode: ResourceDataMode
  categories: ResourceCategory[]
}> {
  const mode = currentMode()

  if (mode === "database") {
    await ensureDatabaseBootstrapped()

    return {
      mode,
      categories: await listDbResourceCategories(),
    }
  }

  return {
    mode,
    categories: await listMockResourceCategories(),
  }
}

export async function createResourceCategoryService(
  name: string,
  symbol?: string | null
): Promise<{ mode: ResourceDataMode; category: ResourceCategory }> {
  const mode = currentMode()

  if (mode === "database") {
    return {
      mode,
      category: await createDbResourceCategory(name, symbol),
    }
  }

  return {
    mode,
    category: await createMockResourceCategory(name, symbol),
  }
}

export async function updateResourceCategorySymbolService(
  id: string,
  symbol: string | null
): Promise<{ mode: ResourceDataMode; category: ResourceCategory }> {
  const mode = currentMode()

  if (mode === "database") {
    return {
      mode,
      category: await updateDbResourceCategorySymbol(id, symbol),
    }
  }

  return {
    mode,
    category: await updateMockResourceCategorySymbol(id, symbol),
  }
}

export async function deleteResourceCategoryService(
  id: string
): Promise<{
  mode: ResourceDataMode
  deletedCategory: ResourceCategory
  reassignedCategory: ResourceCategory
  reassignedResources: number
}> {
  const mode = currentMode()

  if (mode === "database") {
    const result = await deleteDbResourceCategory(id)
    return { mode, ...result }
  }

  const result = await deleteMockResourceCategory(id)
  return { mode, ...result }
}

export async function createResourceService(
  input: ResourceInput
): Promise<{ mode: ResourceDataMode; resource: ResourceCard }> {
  const mode = currentMode()

  if (mode === "database") {
    return {
      mode,
      resource: await createDbResource(input),
    }
  }

  return {
    mode,
    resource: await createMockResource(input),
  }
}

export async function listResourcesIncludingDeletedService(): Promise<{
  mode: ResourceDataMode
  resources: ResourceCard[]
}> {
  const mode = currentMode()

  if (mode === "database") {
    await ensureDatabaseBootstrapped()

    return {
      mode,
      resources: await listDbResourcesIncludingDeleted(),
    }
  }

  const hasResources = await hasAnyMockResources()
  if (!hasResources) {
    return { mode, resources: [] }
  }

  return {
    mode,
    resources: await listMockResourcesIncludingDeleted(),
  }
}

export async function updateResourceService(
  id: string,
  input: ResourceInput
): Promise<{ mode: ResourceDataMode; resource: ResourceCard }> {
  const mode = currentMode()

  if (mode === "database") {
    return {
      mode,
      resource: await updateDbResource(id, input),
    }
  }

  return {
    mode,
    resource: await updateMockResource(id, input),
  }
}

export async function deleteResourceService(
  id: string,
  actor?: ResourceAuditActor
): Promise<{ mode: ResourceDataMode }> {
  const mode = currentMode()

  if (mode === "database") {
    await deleteDbResource(id, actor)
    return { mode }
  }

  await deleteMockResource(id, actor)
  return { mode }
}

export async function restoreResourceService(
  id: string,
  actor?: ResourceAuditActor
): Promise<{ mode: ResourceDataMode; resource: ResourceCard }> {
  const mode = currentMode()

  if (mode === "database") {
    return {
      mode,
      resource: await restoreDbResource(id, actor),
    }
  }

  return {
    mode,
    resource: await restoreMockResource(id, actor),
  }
}

export async function listResourceAuditLogsService(
  limit = 200
): Promise<{ mode: ResourceDataMode; logs: ResourceAuditLogEntry[] }> {
  const mode = currentMode()

  if (mode === "database") {
    await ensureDatabaseBootstrapped()

    return {
      mode,
      logs: await listDbResourceAuditLogs(limit),
    }
  }

  return {
    mode,
    logs: await listMockResourceAuditLogs(limit),
  }
}
