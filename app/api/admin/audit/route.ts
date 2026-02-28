import { NextResponse } from "next/server"
import { createApiErrorResponse } from "@/lib/api-error"
import { z } from "zod"

import { auth } from "@/auth"
import { listResourceAuditLogsService } from "@/lib/resource-service"

export const runtime = "nodejs"

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
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
  const session = await auth()

  if (!session?.user?.id) {
    return errorResponse("Authentication required.", 401)
  }

  if (!session.user.isAdmin) {
    return errorResponse("Admin access required.", 403)
  }

  const queryResult = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  )

  if (!queryResult.success) {
    return errorResponse("Invalid query parameters.", 400)
  }

  try {
    const { mode, logs } = await listResourceAuditLogsService(queryResult.data.limit)
    return NextResponse.json({ mode, logs })
  } catch (error) {
    console.error("Error in /api/admin/audit GET handler:", error)
    return errorResponse("Unexpected server error.", 500)
  }
}
