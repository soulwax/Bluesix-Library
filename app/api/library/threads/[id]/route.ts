import { NextResponse } from "next/server"
import { createApiErrorResponse } from "@/lib/api-error"

import { auth } from "@/auth"
import { hasDatabaseEnv } from "@/lib/env"
import { findAskLibraryThreadByIdForUser } from "@/lib/ask-library-thread-repository"

export const runtime = "nodejs"

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errorResponse("Authentication required.", 401)
    }

    if (!hasDatabaseEnv()) {
      return errorResponse("Ask Library thread persistence is unavailable.", 404)
    }

    const params = await context.params
    const threadId = params.id?.trim()
    if (!threadId) {
      return errorResponse("Thread id is required.", 400)
    }

    const thread = await findAskLibraryThreadByIdForUser(session.user.id, threadId)
    if (!thread) {
      return errorResponse("Thread not found.", 404)
    }

    return NextResponse.json({ thread })
  } catch {
    return errorResponse("Unexpected server error.", 500)
  }
}
