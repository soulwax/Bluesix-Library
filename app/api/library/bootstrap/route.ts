import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { createApiErrorResponse } from "@/lib/api-error"
import {
  listResourceCategoriesService,
  listResourceOrganizationsService,
  listResourcesPageService,
  listResourceWorkspaceCountsService,
  listResourceWorkspacesService,
} from "@/lib/resource-service"

export const runtime = "nodejs"

function parseOptionalQueryInt(
  value: string | null,
  fallback: number,
): number {
  const trimmed = value?.trim()
  if (!trimmed) {
    return fallback
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    const url = new URL(request.url)
    const requestedOrganizationId =
      url.searchParams.get("organizationId")?.trim() || null
    const requestedWorkspaceId =
      url.searchParams.get("workspaceId")?.trim() || null
    const limit = parseOptionalQueryInt(url.searchParams.get("limit"), 200)
    const options = {
      userId: session?.user?.id ?? null,
      includeAllWorkspaces: session?.user?.isFirstAdmin === true,
    }

    const [organizationsResult, countsResult] =
      await Promise.all([
        listResourceOrganizationsService(options),
        listResourceWorkspaceCountsService(options),
      ])
    const hasRequestedOrganization =
      requestedOrganizationId !== null &&
      organizationsResult.organizations.some(
        (organization) => organization.id === requestedOrganizationId,
      )
    const effectiveOrganizationId = hasRequestedOrganization
      ? requestedOrganizationId
      : (organizationsResult.organizations[0]?.id ?? null)
    const workspacesResult = await listResourceWorkspacesService({
      ...options,
      organizationId: effectiveOrganizationId,
    })
    const hasRequestedWorkspace =
      requestedWorkspaceId !== null &&
      workspacesResult.workspaces.some(
        (workspace) => workspace.id === requestedWorkspaceId,
      )
    const effectiveWorkspaceId = hasRequestedWorkspace
      ? requestedWorkspaceId
      : (workspacesResult.workspaces[0]?.id ?? null)
    const [resourcesResult, categoriesResult] = await Promise.all([
      listResourcesPageService({
        ...options,
        workspaceId: effectiveWorkspaceId,
        offset: 0,
        limit,
      }),
      listResourceCategoriesService({
        ...options,
        workspaceId: effectiveWorkspaceId,
      }),
    ])

    const mode =
      resourcesResult.mode === "database" ||
      categoriesResult.mode === "database" ||
      organizationsResult.mode === "database" ||
      workspacesResult.mode === "database" ||
      countsResult.mode === "database"
        ? "database"
        : "mock"

    return NextResponse.json({
      mode,
      organizationId: effectiveOrganizationId,
      workspaceId: effectiveWorkspaceId,
      resources: resourcesResult.resources,
      nextOffset: resourcesResult.nextOffset,
      categories: categoriesResult.categories,
      organizations: organizationsResult.organizations,
      workspaces: workspacesResult.workspaces,
      workspaceCounts: countsResult.countsByWorkspace,
    })
  } catch {
    return createApiErrorResponse({
      message: "Unexpected server error.",
      status: 500,
    })
  }
}
