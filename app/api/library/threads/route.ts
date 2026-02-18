import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { hasDatabaseEnv } from "@/lib/env"
import { listAskLibraryThreadsForUser } from "@/lib/ask-library-thread-repository"

export const runtime = "nodejs"

const querySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(30).optional(),
})

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errorResponse("Authentication required.", 401)
    }

    if (!hasDatabaseEnv()) {
      return NextResponse.json({ threads: [] })
    }

    const { searchParams } = new URL(request.url)
    const input = querySchema.parse({
      workspaceId: searchParams.get("workspaceId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    })

    const threads = await listAskLibraryThreadsForUser(session.user.id, {
      workspaceId: input.workspaceId,
      limit: input.limit,
    })

    return NextResponse.json({ threads })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid ask-library thread query.",
          details: error.flatten(),
        },
        { status: 400 }
      )
    }

    return errorResponse("Unexpected server error.", 500)
  }
}
