import { NextResponse } from "next/server"
import { createApiErrorResponse, readRequestJson } from "@/lib/api-error"
import { z } from "zod"

import { auth } from "@/auth"
import { deriveUserRole, hasAdminAccess } from "@/lib/authorization"
import { CSRFValidationError, validateCSRF } from "@/lib/csrf-protection"
import {
  asRateLimitJsonResponse,
  assertRequestRateLimit,
  RATE_LIMIT_RULES,
} from "@/lib/rate-limit"
import { ResourceOrganizationAlreadyExistsError } from "@/lib/resource-repository"
import {
  createResourceOrganizationService,
  listResourceOrganizationsService,
} from "@/lib/resource-service"

export const runtime = "nodejs"

const createOrganizationSchema = z.object({
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

export async function GET() {
  try {
    const session = await auth()
    const { mode, organizations } = await listResourceOrganizationsService({
      userId: session?.user?.id ?? null,
      includeAllWorkspaces: session?.user?.isFirstAdmin === true,
    })

    return NextResponse.json({ mode, organizations })
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

    const role = deriveUserRole({
      role: session.user.role,
      isAdmin: session.user.isAdmin,
      isFirstAdmin: session.user.isFirstAdmin,
    })
    if (!hasAdminAccess(role)) {
      return errorResponse("Admin access required.", 403)
    }

    const payload = await readRequestJson(request)
    const input = createOrganizationSchema.parse(payload)
    const { mode, organization } = await createResourceOrganizationService(input.name)

    return NextResponse.json({ mode, organization }, { status: 201 })
  } catch (error) {
    const rateLimited = asRateLimitJsonResponse(error)
    if (rateLimited) {
      return rateLimited
    }

    if (error instanceof CSRFValidationError) {
      return errorResponse("Invalid request origin.", 403)
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid organization payload.",
          details: error.flatten(),
        },
        { status: 400 },
      )
    }

    if (error instanceof ResourceOrganizationAlreadyExistsError) {
      return errorResponse(error.message, 409)
    }

    return errorResponse("Unexpected server error.", 500)
  }
}
