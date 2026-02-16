import "server-only"

import { sql } from "drizzle-orm"

import { appUsers } from "@/lib/db-schema"
import { ensureSchema, getDb } from "@/lib/db"

export interface AuthUserRecord {
  id: string
  email: string
  passwordHash: string
}

export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`A user with email ${email} already exists.`)
    this.name = "UserAlreadyExistsError"
  }
}

function normalizeRow(row: AuthUserRow): AuthUserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
  }
}

type AuthUserRow = {
  id: string
  email: string
  passwordHash: string
}

function readErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null
  }

  if ("code" in error && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code
  }

  if (
    "cause" in error &&
    typeof (error as { cause?: unknown }).cause === "object" &&
    (error as { cause?: unknown }).cause !== null &&
    "code" in (error as { cause: { code?: unknown } }).cause &&
    typeof (error as { cause: { code?: unknown } }).cause.code === "string"
  ) {
    return (error as { cause: { code: string } }).cause.code
  }

  return null
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  return readErrorCode(error) === "23505"
}

export async function findUserByEmail(
  email: string
): Promise<AuthUserRecord | null> {
  await ensureSchema()
  const db = getDb()

  const rows = await db
    .select({
      id: appUsers.id,
      email: appUsers.email,
      passwordHash: appUsers.passwordHash,
    })
    .from(appUsers)
    .where(sql`lower(${appUsers.email}) = ${email.toLowerCase()}`)
    .limit(1)

  if (rows.length === 0) {
    return null
  }

  return normalizeRow(rows[0])
}

export async function createUser(
  email: string,
  passwordHash: string
): Promise<AuthUserRecord> {
  await ensureSchema()
  const db = getDb()

  try {
    const rows = await db
      .insert(appUsers)
      .values({
        email: email.toLowerCase(),
        passwordHash,
      })
      .returning({
        id: appUsers.id,
        email: appUsers.email,
        passwordHash: appUsers.passwordHash,
      })

    if (rows.length === 0) {
      throw new Error("Failed to insert app user.")
    }

    return normalizeRow(rows[0])
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new UserAlreadyExistsError(email)
    }

    throw error
  }
}
