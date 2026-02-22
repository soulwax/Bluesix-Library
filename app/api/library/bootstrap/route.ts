import { NextResponse } from "next/server"

import { auth } from "@/auth"
import {
  listResourceCategoriesService,
  listResourcesService,
  listResourceWorkspacesService,
} from "@/lib/resource-service"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await auth()
    const options = {
      userId: session?.user?.id ?? null,
      includeAllWorkspaces: session?.user?.isFirstAdmin === true,
    }

    const [resourcesResult, categoriesResult, workspacesResult] =
      await Promise.all([
        listResourcesService(options),
        listResourceCategoriesService(options),
        listResourceWorkspacesService(options),
      ])

    const mode =
      resourcesResult.mode === "database" ||
      categoriesResult.mode === "database" ||
      workspacesResult.mode === "database"
        ? "database"
        : "mock"

    return NextResponse.json({
      mode,
      resources: resourcesResult.resources,
      categories: categoriesResult.categories,
      workspaces: workspacesResult.workspaces,
    })
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    )
  }
}
