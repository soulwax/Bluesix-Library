import { NextResponse } from "next/server"

import {
  InvalidEmailVerificationTokenError,
  verifyAuthEmailToken,
} from "@/lib/auth-service"

export const runtime = "nodejs"

function redirectToStatus(status: "success" | "invalid") {
  const baseUrl =
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim()}`
      : "http://localhost:3000")

  const target = new URL("/", baseUrl)
  target.searchParams.set("emailVerification", status)
  return NextResponse.redirect(target)
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim()
  if (!token) {
    return redirectToStatus("invalid")
  }

  try {
    await verifyAuthEmailToken(token)
    return redirectToStatus("success")
  } catch (error) {
    if (error instanceof InvalidEmailVerificationTokenError) {
      return redirectToStatus("invalid")
    }

    return redirectToStatus("invalid")
  }
}
