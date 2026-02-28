"use client"

import Link from "next/link"
import { useMemo, useState, type FormEvent } from "react"

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 72

interface ResetPasswordApiResponse {
  error?: string
  ok?: boolean
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const normalizedToken = token.trim()
  const hasToken = normalizedToken.length > 0

  const canSubmit = useMemo(() => {
    return (
      hasToken &&
      !isSubmitting &&
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH &&
      confirmPassword.length > 0
    )
  }, [confirmPassword.length, hasToken, isSubmitting, password.length])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: normalizedToken,
          password,
        }),
      })

      const payload = await readJson<ResetPasswordApiResponse>(response)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Failed to reset password.")
      }

      setIsSuccess(true)
      setPassword("")
      setConfirmPassword("")
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not reset password."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md rounded-xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a new password for your BlueSix account.
        </p>

        {!hasToken ? (
          <div className="mt-5 space-y-4">
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              This reset link is invalid. Request a new password reset email.
            </p>
            <Link
              href="/"
              className="inline-flex rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              Back to sign in
            </Link>
          </div>
        ) : isSuccess ? (
          <div className="mt-5 space-y-4">
            <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              Password updated. You can now sign in with your new password.
            </p>
            <Link
              href="/"
              className="inline-flex rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-sm font-medium">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                required
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Password must be between {PASSWORD_MIN_LENGTH} and{" "}
              {PASSWORD_MAX_LENGTH} characters.
            </p>

            {errorMessage ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
