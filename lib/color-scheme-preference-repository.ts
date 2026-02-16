import "server-only"

import { eq, sql } from "drizzle-orm"

import { colorSchemePreferences } from "@/lib/db-schema"
import { ensureSchema, getDb } from "@/lib/db"

export interface ColorSchemePreferenceRecord {
  id: string
  userId: string | null
  visitorId: string | null
  colorScheme: string
  createdAt: string
  updatedAt: string
}

type PreferenceRow = {
  id: string
  userId: string | null
  visitorId: string | null
  colorScheme: string
  createdAt: Date | string
  updatedAt: Date | string
}

function normalizeTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value
}

function normalizeRow(row: PreferenceRow): ColorSchemePreferenceRecord {
  return {
    id: row.id,
    userId: row.userId,
    visitorId: row.visitorId,
    colorScheme: row.colorScheme,
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
  }
}

async function selectPreferenceByColumn(
  column: typeof colorSchemePreferences.userId | typeof colorSchemePreferences.visitorId,
  value: string
): Promise<ColorSchemePreferenceRecord | null> {
  await ensureSchema()
  const db = getDb()

  const rows = await db
    .select({
      id: colorSchemePreferences.id,
      userId: colorSchemePreferences.userId,
      visitorId: colorSchemePreferences.visitorId,
      colorScheme: colorSchemePreferences.colorScheme,
      createdAt: colorSchemePreferences.createdAt,
      updatedAt: colorSchemePreferences.updatedAt,
    })
    .from(colorSchemePreferences)
    .where(eq(column, value))
    .limit(1)

  if (rows.length === 0) {
    return null
  }

  return normalizeRow(rows[0] as PreferenceRow)
}

export async function findColorSchemePreferenceByUserId(
  userId: string
): Promise<ColorSchemePreferenceRecord | null> {
  return selectPreferenceByColumn(colorSchemePreferences.userId, userId)
}

export async function findColorSchemePreferenceByVisitorId(
  visitorId: string
): Promise<ColorSchemePreferenceRecord | null> {
  return selectPreferenceByColumn(colorSchemePreferences.visitorId, visitorId)
}

export async function upsertColorSchemePreferenceForUser(
  userId: string,
  colorScheme: string
): Promise<ColorSchemePreferenceRecord> {
  await ensureSchema()
  const db = getDb()

  const rows = await db
    .insert(colorSchemePreferences)
    .values({
      userId,
      visitorId: null,
      colorScheme,
    })
    .onConflictDoUpdate({
      target: colorSchemePreferences.userId,
      set: {
        colorScheme,
        updatedAt: sql`NOW()`,
      },
    })
    .returning({
      id: colorSchemePreferences.id,
      userId: colorSchemePreferences.userId,
      visitorId: colorSchemePreferences.visitorId,
      colorScheme: colorSchemePreferences.colorScheme,
      createdAt: colorSchemePreferences.createdAt,
      updatedAt: colorSchemePreferences.updatedAt,
    })

  const updated = rows[0]
  if (!updated) {
    throw new Error("Failed to upsert user color scheme preference.")
  }

  return normalizeRow(updated as PreferenceRow)
}

export async function upsertColorSchemePreferenceForVisitor(
  visitorId: string,
  colorScheme: string
): Promise<ColorSchemePreferenceRecord> {
  await ensureSchema()
  const db = getDb()

  const rows = await db
    .insert(colorSchemePreferences)
    .values({
      userId: null,
      visitorId,
      colorScheme,
    })
    .onConflictDoUpdate({
      target: colorSchemePreferences.visitorId,
      set: {
        colorScheme,
        updatedAt: sql`NOW()`,
      },
    })
    .returning({
      id: colorSchemePreferences.id,
      userId: colorSchemePreferences.userId,
      visitorId: colorSchemePreferences.visitorId,
      colorScheme: colorSchemePreferences.colorScheme,
      createdAt: colorSchemePreferences.createdAt,
      updatedAt: colorSchemePreferences.updatedAt,
    })

  const updated = rows[0]
  if (!updated) {
    throw new Error("Failed to upsert visitor color scheme preference.")
  }

  return normalizeRow(updated as PreferenceRow)
}

