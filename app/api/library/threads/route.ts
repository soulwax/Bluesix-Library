import { NextResponse } from "next/server"
import { createApiErrorResponse } from "@/lib/api-error"
import { z } from "zod"

import { auth } from "@/auth"
import { hasDatabaseEnv } from "@/lib/env"
import { listAskLibraryThreadsForUser } from "@/lib/ask-library-thread-repository"

export const runtime = "nodejs"

const querySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(30).optional(),
})

function errorResponse(
  message: string,
  status: number,
  options?: {
    code?: string
    details?: unknown
    headers?: HeadersInit
  },
) {
  return createApiErrorResponse({
    message,
    status,
    code: options?.code,
    details: options?.details,
    headers: options?.headers,
  })
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
      return errorResponse("Invalid ask-library thread query.", 400, { code: "VALIDATION_ERROR", details: error.flatten() })
    }

    return errorResponse("Unexpected server error.", 500)
  }
}
