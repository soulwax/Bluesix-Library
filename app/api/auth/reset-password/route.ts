import { NextResponse } from "next/server"
import { z } from "zod"

import {
  InvalidPasswordResetTokenError,
  resetAuthPassword,
} from "@/lib/auth-service"
import { CSRFValidationError, validateCSRF } from "@/lib/csrf-protection"
import { hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password"
import {
  asRateLimitJsonResponse,
  assertRequestRateLimit,
  RATE_LIMIT_RULES,
} from "@/lib/rate-limit"

export const runtime = "nodejs"

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1).max(512),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
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
      RATE_LIMIT_RULES.AUTH_PASSWORD_RESET_CONSUME,
      {
        message: "Too many password reset attempts. Please request a new link.",
      },
    )

    const payload = await readRequestJson(request)
    const input = resetPasswordSchema.parse(payload)
    const passwordHash = await hashPassword(input.password)
    const { mode } = await resetAuthPassword(input.token, passwordHash)

    return NextResponse.json({
      mode,
      ok: true,
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

    if (error instanceof InvalidPasswordResetTokenError) {
      return errorResponse("Password reset link is invalid or expired.", 400)
    }

    return errorResponse("Unexpected server error.", 500)
  }
}
