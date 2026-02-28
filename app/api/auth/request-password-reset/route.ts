import { NextResponse } from "next/server"
import { z } from "zod"

import { requestAuthPasswordReset } from "@/lib/auth-service"
import { CSRFValidationError, validateCSRF } from "@/lib/csrf-protection"
import {
  asRateLimitJsonResponse,
  assertRequestRateLimit,
  RATE_LIMIT_RULES,
} from "@/lib/rate-limit"

export const runtime = "nodejs"

const requestResetSchema = z.object({
  email: z.string().trim().email().max(320),
})

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
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

export async function POST(request: Request) {
  try {
    validateCSRF(request)
    await assertRequestRateLimit(
      request,
      RATE_LIMIT_RULES.AUTH_PASSWORD_RESET_REQUEST,
      {
        message: "Too many password reset requests. Please wait and try again.",
      },
    )

    const payload = await readRequestJson(request)
    const input = requestResetSchema.parse(payload)
    const { mode, delivered } = await requestAuthPasswordReset(input.email)
    const shouldShowPreview = process.env.NODE_ENV !== "production"

    return NextResponse.json({
      mode,
      ok: true,
      resetEmailMode: shouldShowPreview ? delivered.mode : undefined,
      resetPreviewUrl: shouldShowPreview ? delivered.previewUrl ?? null : null,
      message:
        "If an account exists for this email, password reset instructions have been sent.",
    })
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
          error: "Invalid password reset payload.",
          details: error.flatten(),
        },
        { status: 400 }
      )
    }

    return errorResponse("Unexpected server error.", 500)
  }
}
