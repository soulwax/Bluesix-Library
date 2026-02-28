import type { Metadata } from "next"

import { ResetPasswordForm } from "@/app/reset-password/reset-password-form"

export const metadata: Metadata = {
  title: "Reset Password | BlueSix",
  description: "Reset your BlueSix account password.",
}

interface ResetPasswordPageProps {
  searchParams?: {
    token?: string | string[]
  }
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const rawToken = searchParams?.token
  const token =
    typeof rawToken === "string"
      ? rawToken
      : Array.isArray(rawToken) && rawToken.length > 0
        ? rawToken[0] ?? ""
        : ""

  return <ResetPasswordForm token={token} />
}
