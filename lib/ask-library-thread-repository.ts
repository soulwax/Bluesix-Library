import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { askLibraryThreads } from "@/lib/db-schema"
import { ensureSchema, getDb } from "@/lib/db"
import type { AskLibraryCitation, AskLibraryReasoning } from "@/lib/library-ask"

const MAX_THREAD_TITLE_LENGTH = 120
const MAX_TURN_CONTENT_LENGTH = 2000
const MAX_FOLLOW_UP_SUGGESTIONS = 4
const MAX_STORED_TURNS = 80

type AskLibraryThreadTurnRole = "user" | "assistant"

type StoredThreadTurn = {
  id: string
  role: AskLibraryThreadTurnRole
  content: string
  createdAt: string
  usedAi?: boolean
  model?: string | null
  citations?: AskLibraryCitation[]
  reasoning?: AskLibraryReasoning | null
  followUpSuggestions?: string[]
}

export interface AskLibraryThreadRecord {
  id: string
  userId: string
  workspaceId: string | null
  title: string
  conversation: StoredThreadTurn[]
  lastQuestion: string | null
  lastAnswer: string | null
  createdAt: string
  updatedAt: string
}

export interface AskLibraryThreadSummary {
  id: string
  userId: string
  workspaceId: string | null
  title: string
  turnCount: number
  lastQuestion: string | null
  lastAnswer: string | null
  createdAt: string
  updatedAt: string
}

interface AppendAskLibraryThreadInput {
  userId: string
  threadId?: string | null
  workspaceId?: string | null
  question: string
  answer: string
  usedAi: boolean
  model: string | null
  citations: AskLibraryCitation[]
  reasoning: AskLibraryReasoning
  followUpSuggestions: string[]
}

type ThreadRow = {
  id: string
  userId: string
  workspaceId: string | null
  title: string
  conversationJson: unknown
  lastQuestion: string | null
  lastAnswer: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

type ThreadSummaryRow = {
  id: string
  userId: string
  workspaceId: string | null
  title: string
  turnCount: number
  lastQuestion: string | null
  lastAnswer: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

function normalizeTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value
}

function normalizePlainText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength)
}

function normalizeTitle(value: string): string {
  const normalized = normalizePlainText(value, MAX_THREAD_TITLE_LENGTH)
  return normalized.length > 0 ? normalized : "Untitled thread"
}

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  const deduped = new Map<string, string>()
  for (const item of input) {
    if (typeof item !== "string") {
      continue
    }

    const normalized = normalizePlainText(item, 40)
    if (!normalized) {
      continue
    }

    const key = normalized.toLowerCase()
    if (!deduped.has(key)) {
      deduped.set(key, normalized)
    }
  }

  return [...deduped.values()].slice(0, 8)
}

function normalizeCitation(input: unknown): AskLibraryCitation | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const citation = input as Partial<AskLibraryCitation>
  if (
    typeof citation.resourceId !== "string" ||
    typeof citation.category !== "string" ||
    typeof citation.linkUrl !== "string" ||
    typeof citation.linkLabel !== "string"
  ) {
    return null
  }

  return {
    index:
      typeof citation.index === "number" && Number.isFinite(citation.index)
        ? Math.max(1, Math.floor(citation.index))
        : 1,
    resourceId: citation.resourceId,
    category: normalizePlainText(citation.category, 80),
    tags: normalizeTags(citation.tags),
    linkUrl: normalizePlainText(citation.linkUrl, 2048),
    linkLabel: normalizePlainText(citation.linkLabel, 120) || "Resource",
    linkNote:
      typeof citation.linkNote === "string"
        ? normalizePlainText(citation.linkNote, 400)
        : null,
    score:
      typeof citation.score === "number" && Number.isFinite(citation.score)
        ? citation.score
        : 0,
    confidence:
      typeof citation.confidence === "number" && Number.isFinite(citation.confidence)
        ? Math.max(0, Math.min(100, Math.round(citation.confidence)))
        : 0,
  }
}

function normalizeCitations(input: unknown): AskLibraryCitation[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((item) => normalizeCitation(item))
    .filter((item): item is AskLibraryCitation => item !== null)
    .slice(0, 8)
}

function normalizeReasoning(input: unknown): AskLibraryReasoning | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const reasoning = input as Partial<AskLibraryReasoning>
  const summary =
    typeof reasoning.summary === "string"
      ? normalizePlainText(reasoning.summary, 600)
      : ""

  if (!summary) {
    return null
  }

  const label =
    reasoning.confidenceLabel === "high" ||
    reasoning.confidenceLabel === "medium" ||
    reasoning.confidenceLabel === "low"
      ? reasoning.confidenceLabel
      : "low"

  return {
    summary,
    queryTokens: normalizeTags(reasoning.queryTokens),
    primaryCategories: normalizeTags(reasoning.primaryCategories),
    averageConfidence:
      typeof reasoning.averageConfidence === "number" &&
      Number.isFinite(reasoning.averageConfidence)
        ? Math.max(0, Math.min(100, Math.round(reasoning.averageConfidence)))
        : 0,
    confidenceLabel: label,
  }
}

function normalizeFollowUpSuggestions(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  const deduped = new Map<string, string>()
  for (const item of input) {
    if (typeof item !== "string") {
      continue
    }

    const normalized = normalizePlainText(item, 200)
    if (!normalized) {
      continue
    }

    const key = normalized.toLowerCase()
    if (!deduped.has(key)) {
      deduped.set(key, normalized)
    }
  }

  return [...deduped.values()].slice(0, MAX_FOLLOW_UP_SUGGESTIONS)
}

function normalizeTurn(input: unknown): StoredThreadTurn | null {
  if (!input || typeof input !== "object") {
    return null
  }

  const turn = input as Partial<StoredThreadTurn>
  if (turn.role !== "user" && turn.role !== "assistant") {
    return null
  }

  if (typeof turn.content !== "string") {
    return null
  }

  const content = normalizePlainText(turn.content, MAX_TURN_CONTENT_LENGTH)
  if (!content) {
    return null
  }

  const createdAt =
    typeof turn.createdAt === "string" && turn.createdAt.length > 0
      ? turn.createdAt
      : new Date().toISOString()

  return {
    id:
      typeof turn.id === "string" && turn.id.length > 0
        ? turn.id
        : crypto.randomUUID(),
    role: turn.role,
    content,
    createdAt,
    usedAi: turn.usedAi === true,
    model: typeof turn.model === "string" ? turn.model : null,
    citations: normalizeCitations(turn.citations),
    reasoning: normalizeReasoning(turn.reasoning),
    followUpSuggestions: normalizeFollowUpSuggestions(turn.followUpSuggestions),
  }
}

function normalizeConversation(input: unknown): StoredThreadTurn[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((item) => normalizeTurn(item))
    .filter((item): item is StoredThreadTurn => item !== null)
    .slice(-MAX_STORED_TURNS)
}

function normalizeThreadRow(row: ThreadRow): AskLibraryThreadRecord {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    title: normalizeTitle(row.title),
    conversation: normalizeConversation(row.conversationJson),
    lastQuestion:
      typeof row.lastQuestion === "string" ? normalizePlainText(row.lastQuestion, 200) : null,
    lastAnswer:
      typeof row.lastAnswer === "string" ? normalizePlainText(row.lastAnswer, 300) : null,
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
  }
}

function normalizeThreadSummaryRow(row: ThreadSummaryRow): AskLibraryThreadSummary {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    title: normalizeTitle(row.title),
    turnCount:
      typeof row.turnCount === "number" && Number.isFinite(row.turnCount)
        ? Math.max(0, Math.floor(row.turnCount))
        : 0,
    lastQuestion:
      typeof row.lastQuestion === "string" ? normalizePlainText(row.lastQuestion, 200) : null,
    lastAnswer:
      typeof row.lastAnswer === "string" ? normalizePlainText(row.lastAnswer, 300) : null,
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
  }
}

function buildDefaultTitle(question: string): string {
  return normalizeTitle(question)
}

export async function listAskLibraryThreadsForUser(
  userId: string,
  options?: {
    workspaceId?: string | null
    limit?: number
  }
): Promise<AskLibraryThreadSummary[]> {
  await ensureSchema()
  const db = getDb()

  const normalizedUserId = userId.trim()
  if (!normalizedUserId) {
    return []
  }

  const conditions = [eq(askLibraryThreads.userId, normalizedUserId)]
  if (typeof options?.workspaceId === "string" && options.workspaceId.length > 0) {
    conditions.push(eq(askLibraryThreads.workspaceId, options.workspaceId))
  } else if (options?.workspaceId === null) {
    conditions.push(isNull(askLibraryThreads.workspaceId))
  }

  const normalizedLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(30, Math.floor(options.limit)))
      : 12

  const rows = await db
    .select({
      id: askLibraryThreads.id,
      userId: askLibraryThreads.userId,
      workspaceId: askLibraryThreads.workspaceId,
      title: askLibraryThreads.title,
      turnCount: sql<number>`jsonb_array_length(${askLibraryThreads.conversationJson})`.as(
        "turn_count"
      ),
      lastQuestion: askLibraryThreads.lastQuestion,
      lastAnswer: askLibraryThreads.lastAnswer,
      createdAt: askLibraryThreads.createdAt,
      updatedAt: askLibraryThreads.updatedAt,
    })
    .from(askLibraryThreads)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(askLibraryThreads.updatedAt))
    .limit(normalizedLimit)

  return rows.map((row) => normalizeThreadSummaryRow(row as ThreadSummaryRow))
}

export async function findAskLibraryThreadByIdForUser(
  userId: string,
  threadId: string
): Promise<AskLibraryThreadRecord | null> {
  await ensureSchema()
  const db = getDb()

  const normalizedUserId = userId.trim()
  const normalizedThreadId = threadId.trim()
  if (!normalizedUserId || !normalizedThreadId) {
    return null
  }

  const rows = await db
    .select({
      id: askLibraryThreads.id,
      userId: askLibraryThreads.userId,
      workspaceId: askLibraryThreads.workspaceId,
      title: askLibraryThreads.title,
      conversationJson: askLibraryThreads.conversationJson,
      lastQuestion: askLibraryThreads.lastQuestion,
      lastAnswer: askLibraryThreads.lastAnswer,
      createdAt: askLibraryThreads.createdAt,
      updatedAt: askLibraryThreads.updatedAt,
    })
    .from(askLibraryThreads)
    .where(
      and(
        eq(askLibraryThreads.id, normalizedThreadId),
        eq(askLibraryThreads.userId, normalizedUserId)
      )
    )
    .limit(1)

  if (rows.length === 0) {
    return null
  }

  return normalizeThreadRow(rows[0] as ThreadRow)
}

export async function appendAskLibraryThreadInteraction(
  input: AppendAskLibraryThreadInput
): Promise<AskLibraryThreadRecord> {
  await ensureSchema()
  const db = getDb()

  const normalizedUserId = input.userId.trim()
  if (!normalizedUserId) {
    throw new Error("Ask Library thread persistence requires a valid user id.")
  }

  const question = normalizePlainText(input.question, MAX_TURN_CONTENT_LENGTH)
  const answer = normalizePlainText(input.answer, MAX_TURN_CONTENT_LENGTH)
  if (!question || !answer) {
    throw new Error("Ask Library thread persistence requires non-empty question and answer.")
  }

  const normalizedThreadId = input.threadId?.trim() || null
  const normalizedWorkspaceId = input.workspaceId?.trim() || null
  let existing: AskLibraryThreadRecord | null = null

  if (normalizedThreadId) {
    existing = await findAskLibraryThreadByIdForUser(normalizedUserId, normalizedThreadId)
    if (!existing) {
      throw new Error("Ask Library thread not found.")
    }
  }

  const now = new Date().toISOString()
  const userTurn: StoredThreadTurn = {
    id: crypto.randomUUID(),
    role: "user",
    content: question,
    createdAt: now,
  }
  const assistantTurn: StoredThreadTurn = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: answer,
    createdAt: now,
    usedAi: input.usedAi,
    model: input.model,
    citations: normalizeCitations(input.citations),
    reasoning: normalizeReasoning(input.reasoning),
    followUpSuggestions: normalizeFollowUpSuggestions(input.followUpSuggestions),
  }

  const nextConversation = [...(existing?.conversation ?? []), userTurn, assistantTurn].slice(
    -MAX_STORED_TURNS
  )
  const nextTitle = existing?.title ?? buildDefaultTitle(question)

  if (!existing) {
    const rows = await db
      .insert(askLibraryThreads)
      .values({
        userId: normalizedUserId,
        workspaceId: normalizedWorkspaceId,
        title: nextTitle,
        conversationJson: nextConversation,
        lastQuestion: question,
        lastAnswer: answer,
      })
      .returning({
        id: askLibraryThreads.id,
        userId: askLibraryThreads.userId,
        workspaceId: askLibraryThreads.workspaceId,
        title: askLibraryThreads.title,
        conversationJson: askLibraryThreads.conversationJson,
        lastQuestion: askLibraryThreads.lastQuestion,
        lastAnswer: askLibraryThreads.lastAnswer,
        createdAt: askLibraryThreads.createdAt,
        updatedAt: askLibraryThreads.updatedAt,
      })

    const inserted = rows[0]
    if (!inserted) {
      throw new Error("Failed to create Ask Library thread.")
    }

    return normalizeThreadRow(inserted as ThreadRow)
  }

  const rows = await db
    .update(askLibraryThreads)
    .set({
      workspaceId: normalizedWorkspaceId,
      title: nextTitle,
      conversationJson: nextConversation,
      lastQuestion: question,
      lastAnswer: answer,
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(askLibraryThreads.id, existing.id),
        eq(askLibraryThreads.userId, normalizedUserId)
      )
    )
    .returning({
      id: askLibraryThreads.id,
      userId: askLibraryThreads.userId,
      workspaceId: askLibraryThreads.workspaceId,
      title: askLibraryThreads.title,
      conversationJson: askLibraryThreads.conversationJson,
      lastQuestion: askLibraryThreads.lastQuestion,
      lastAnswer: askLibraryThreads.lastAnswer,
      createdAt: askLibraryThreads.createdAt,
      updatedAt: askLibraryThreads.updatedAt,
    })

  const updated = rows[0]
  if (!updated) {
    throw new Error("Failed to update Ask Library thread.")
  }

  return normalizeThreadRow(updated as ThreadRow)
}
