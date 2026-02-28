import { NextResponse } from "next/server"
import { createApiErrorResponse } from "@/lib/api-error"

import { auth } from "@/auth"
import { exportAuthAccountData, UserNotFoundError } from "@/lib/auth-service"

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

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errorResponse("Authentication required.", 401)
    }

    const payload = await exportAuthAccountData(session.user.id)
    const datePart = new Date().toISOString().slice(0, 10)
    const filename = `bluesix-account-export-${datePart}.json`

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return errorResponse("Account not found.", 404)
    }

    return errorResponse("Unexpected server error.", 500)
  }
}
