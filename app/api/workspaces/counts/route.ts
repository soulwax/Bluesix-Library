import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { listResourceWorkspaceCountsService } from "@/lib/resource-service"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await auth()
    const { mode, countsByWorkspace } = await listResourceWorkspaceCountsService({
      userId: session?.user?.id ?? null,
      includeAllWorkspaces: session?.user?.isFirstAdmin === true,
    })

    return NextResponse.json({
      mode,
      countsByWorkspace,
    })
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    )
  }
}
