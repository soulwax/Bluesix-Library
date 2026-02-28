import { NextResponse } from "next/server"
import { z } from "zod"

import {
  resendAuthVerificationEmail,
  UserNotFoundError,
} from "@/lib/auth-service"
import { CSRFValidationError, validateCSRF } from "@/lib/csrf-protection"
import {
  asRateLimitJsonResponse,
  assertRequestRateLimit,
  RATE_LIMIT_RULES,
} from "@/lib/rate-limit"

export const runtime = "nodejs"

const resendSchema = z.object({
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
      RATE_LIMIT_RULES.AUTH_RESEND_VERIFICATION,
      {
        message:
          "Too many verification resend requests. Please wait before trying again.",
      },
    )

    const payload = await readRequestJson(request)
    const input = resendSchema.parse(payload)
    const { mode, delivered, alreadyVerified } = await resendAuthVerificationEmail(
      input.email
    )

    return NextResponse.json({
      mode,
      alreadyVerified,
      verificationEmailMode: delivered.mode,
      verificationPreviewUrl: delivered.previewUrl ?? null,
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
          error: "Invalid resend payload.",
          details: error.flatten(),
        },
        { status: 400 }
      )
    }

    if (error instanceof UserNotFoundError) {
      return errorResponse(
        "Account not found. Register first, then verify your email.",
        404
      )
    }

    return errorResponse("Unexpected server error.", 500)
  }
}
