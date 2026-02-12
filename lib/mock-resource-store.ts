import "server-only"

import { loadLibraryResourcesFromFile } from "@/lib/library-parser"
import type { ResourceCard, ResourceInput } from "@/lib/resources"
import { ResourceNotFoundError } from "@/lib/resource-repository"

let mockStore: ResourceCard[] | null = null

function cloneResource(resource: ResourceCard): ResourceCard {
  return {
    id: resource.id,
    category: resource.category,
    links: resource.links.map((link) => ({ ...link })),
  }
}

function ensureMockStore() {
  if (mockStore !== null) {
    return
  }

  mockStore = loadLibraryResourcesFromFile()
}

export function resetMockStoreForTests() {
  mockStore = null
}

export async function listMockResources(): Promise<ResourceCard[]> {
  ensureMockStore()
  return (mockStore ?? []).map(cloneResource)
}

export async function createMockResource(input: ResourceInput): Promise<ResourceCard> {
  ensureMockStore()

  const created: ResourceCard = {
    id: crypto.randomUUID(),
    category: input.category,
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

  const index = (mockStore ?? []).findIndex((resource) => resource.id === id)

  if (index < 0) {
    throw new ResourceNotFoundError(id)
  }

  const updated: ResourceCard = {
    id,
    category: input.category,
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

export async function deleteMockResource(id: string): Promise<void> {
  ensureMockStore()

  const before = mockStore ?? []
  const after = before.filter((resource) => resource.id !== id)

  if (after.length === before.length) {
    throw new ResourceNotFoundError(id)
  }

  mockStore = after
}
