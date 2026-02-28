import { NextResponse } from "next/server"
import { createApiErrorResponse } from "@/lib/api-error"
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
  ResourceWorkspaceLimitReachedError,
} from "@/lib/resource-repository"
import {
  createResourceWorkspaceService,
  listResourceWorkspacesService,
} from "@/lib/resource-service"

export const runtime = "nodejs"

const createWorkspaceSchema = z.object({
  organizationId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(80),
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

async function readRequestJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        path: [],
        message: "Request body must be valid JSON.",
      },
    ])
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    const organizationId = new URL(request.url).searchParams.get("organizationId")
    const { mode, workspaces } = await listResourceWorkspacesService({
      userId: session?.user?.id ?? null,
      organizationId,
      includeAllWorkspaces: session?.user?.isFirstAdmin === true,
    })

    return NextResponse.json({ mode, workspaces })
  } catch {
    return errorResponse("Unexpected server error.", 500)
  }
}

export async function POST(request: Request) {
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

    const payload = await readRequestJson(request)
    const input = createWorkspaceSchema.parse(payload)
    const { mode, workspace } = await createResourceWorkspaceService(
      input.name,
      {
        ownerUserId: session.user.id,
        organizationId: input.organizationId ?? null,
        includeAllWorkspaces: session.user.isFirstAdmin === true,
      }
    )

    return NextResponse.json({ mode, workspace }, { status: 201 })
  } catch (error) {
    const rateLimited = asRateLimitJsonResponse(error)
    if (rateLimited) {
      return rateLimited
    }

    if (error instanceof CSRFValidationError) {
      return errorResponse("Invalid request origin.", 403)
    }

    if (error instanceof z.ZodError) {
      return errorResponse("Invalid workspace payload.", 400, { code: "VALIDATION_ERROR", details: error.flatten() })
    }

    if (error instanceof ResourceWorkspaceAlreadyExistsError) {
      return errorResponse(error.message, 409)
    }

    if (error instanceof ResourceWorkspaceLimitReachedError) {
      return errorResponse(error.message, 409)
    }

    return errorResponse("Unexpected server error.", 500)
  }
}
