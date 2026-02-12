import "server-only"

import { hasDatabaseEnv } from "@/lib/env"
import {
  createMockResource,
  deleteMockResource,
  listMockResources,
  updateMockResource,
} from "@/lib/mock-resource-store"
import {
  createResource as createDbResource,
  deleteResource as deleteDbResource,
  listResources as listDbResources,
  updateResource as updateDbResource,
} from "@/lib/resource-repository"
import type { ResourceCard, ResourceInput } from "@/lib/resources"

export type ResourceDataMode = "database" | "mock"

function currentMode(): ResourceDataMode {
  return hasDatabaseEnv() ? "database" : "mock"
}

export async function listResourcesService(): Promise<{
  mode: ResourceDataMode
  resources: ResourceCard[]
}> {
  const mode = currentMode()

  if (mode === "database") {
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
  id: string
): Promise<{ mode: ResourceDataMode }> {
  const mode = currentMode()

  if (mode === "database") {
    await deleteDbResource(id)
    return { mode }
  }

  await deleteMockResource(id)
  return { mode }
}
