import { NextResponse } from "next/server"
import { createApiErrorResponse, readRequestJson } from "@/lib/api-error"
import { z } from "zod"

import { auth } from "@/auth"
import { CSRFValidationError, validateCSRF } from "@/lib/csrf-protection"
import {
  asRateLimitJsonResponse,
  assertRequestRateLimit,
  RATE_LIMIT_RULES,
} from "@/lib/rate-limit"
import {
  ResourceWorkspaceAlreadyExistsError,
  ResourceWorkspaceNotFoundError,
} from "@/lib/resource-repository"
import {
  deleteResourceWorkspaceService,
  renameResourceWorkspaceService,
} from "@/lib/resource-service"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{ id: string }> | { id: string }
}

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

async function parseWorkspaceId(context: RouteContext) {
  const params = await Promise.resolve(context.params)
  return z.string().uuid().parse(params.id)
}

const renameSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export async function PATCH(request: Request, context: RouteContext) {
  try {
    validateCSRF(request)

    const session = await auth()
    await assertRequestRateLimit(request, RATE_LIMIT_RULES.WRITE_REQUESTS, {
      userId: session?.user?.id ?? null,
      message: "Too many write actions. Please slow down and try again.",
    })
    if (!session?.user?.id) {
      return errorResponse("Authentication required.", 401)
    }

    const workspaceId = await parseWorkspaceId(context)
    const payload = await readRequestJson(request)
    const { name } = renameSchema.parse(payload)

    const { mode, workspace } = await renameResourceWorkspaceService(
      workspaceId,
      name,
      session.user.id,
    )

    return NextResponse.json({ mode, workspace })
  } catch (error) {
    const rateLimited = asRateLimitJsonResponse(error)
    if (rateLimited) {
      return rateLimited
    }

    if (error instanceof CSRFValidationError) {
      return errorResponse("Invalid request origin.", 403)
    }

    if (error instanceof z.ZodError) {
      return errorResponse("Invalid payload.", 400, { code: "VALIDATION_ERROR", details: error.flatten() })
    }
    if (error instanceof ResourceWorkspaceNotFoundError) {
      return errorResponse(error.message, 404)
    }
    if (error instanceof ResourceWorkspaceAlreadyExistsError) {
      return errorResponse(error.message, 409)
    }
    return errorResponse("Unexpected server error.", 500)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    validateCSRF(request)

    const session = await auth()
    await assertRequestRateLimit(request, RATE_LIMIT_RULES.WRITE_REQUESTS, {
      userId: session?.user?.id ?? null,
      message: "Too many write actions. Please slow down and try again.",
    })
    if (!session?.user?.id) {
      return errorResponse("Authentication required.", 401)
    }

    const workspaceId = await parseWorkspaceId(context)
    const { mode } = await deleteResourceWorkspaceService(workspaceId, session.user.id)

    return NextResponse.json({ mode, ok: true })
  } catch (error) {
    const rateLimited = asRateLimitJsonResponse(error)
    if (rateLimited) {
      return rateLimited
    }

    if (error instanceof CSRFValidationError) {
      return errorResponse("Invalid request origin.", 403)
    }

    if (error instanceof ResourceWorkspaceNotFoundError) {
      return errorResponse(error.message, 404)
    }
    return errorResponse("Unexpected server error.", 500)
  }
}
