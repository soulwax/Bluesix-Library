import "server-only"

import type { ResourceCard, ResourceLink } from "@/lib/resources"

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"
const DEFAULT_PERPLEXITY_MODEL = "sonar"
const MAX_QUESTION_LENGTH = 500
const DEFAULT_MAX_CITATIONS = 5
const MAX_CITATIONS = 8

export class MissingPerplexityApiKeyError extends Error {
  constructor() {
    super("AI features are unavailable because PERPLEXITY_API_KEY is not configured.")
    this.name = "MissingPerplexityApiKeyError"
  }
}

export interface AskLibraryCitation {
  index: number
  resourceId: string
  category: string
  tags: string[]
  linkUrl: string
  linkLabel: string
  linkNote: string | null
  score: number
}

export interface AskLibraryResult {
  question: string
  answer: string
  citations: AskLibraryCitation[]
  usedAi: boolean
  model: string | null
}

interface AskLibraryInput {
  question: string
  resources: ResourceCard[]
  maxCitations?: number
  useAi?: boolean
}

interface ScoredMatch {
  resource: ResourceCard
  score: number
  bestLink: ResourceLink | null
  matchedTags: string[]
}

function getPerplexityApiKey(): string {
  const apiKey = process.env.PERPLEXITY_API_KEY?.trim()
  if (!apiKey) {
    throw new MissingPerplexityApiKeyError()
  }

  return apiKey
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeQuestion(value: string): string {
  return normalizeWhitespace(value).slice(0, MAX_QUESTION_LENGTH)
}

function tokenizeQuestion(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9+.#-]+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2)
    )
  )
}

function countTokenMatches(text: string, tokens: string[]): number {
  const haystack = text.toLowerCase()
  let matches = 0

  for (const token of tokens) {
    if (haystack.includes(token)) {
      matches += 1
    }
  }

  return matches
}

function scoreLink(link: ResourceLink, tokens: string[]): number {
  const labelScore = countTokenMatches(link.label, tokens) * 5
  const noteScore = countTokenMatches(link.note ?? "", tokens) * 3
  const urlScore = countTokenMatches(link.url, tokens) * 2

  return labelScore + noteScore + urlScore
}

function scoreResource(resource: ResourceCard, tokens: string[]): ScoredMatch | null {
  if (tokens.length === 0) {
    return null
  }

  const categoryScore = countTokenMatches(resource.category, tokens) * 6
  const tagScore = resource.tags.reduce((acc, tag) => {
    return acc + countTokenMatches(tag, tokens) * 4
  }, 0)

  let bestLink: ResourceLink | null = null
  let bestLinkScore = 0
  let linkScore = 0

  for (const link of resource.links) {
    const nextScore = scoreLink(link, tokens)
    if (nextScore <= 0) {
      continue
    }

    linkScore += Math.min(nextScore, 12)
    if (nextScore > bestLinkScore) {
      bestLinkScore = nextScore
      bestLink = link
    }
  }

  const totalScore = categoryScore + tagScore + linkScore
  if (totalScore <= 0) {
    return null
  }

  const matchedTags = resource.tags.filter((tag) =>
    tokens.some((token) => tag.toLowerCase().includes(token))
  )

  return {
    resource,
    score: totalScore,
    bestLink,
    matchedTags,
  }
}

function toCitations(matches: ScoredMatch[], maxCitations: number): AskLibraryCitation[] {
  return matches.slice(0, maxCitations).map((match, index) => {
    const link = match.bestLink ?? match.resource.links[0] ?? null

    return {
      index: index + 1,
      resourceId: match.resource.id,
      category: match.resource.category,
      tags: match.matchedTags.slice(0, 6),
      linkUrl: link?.url ?? "",
      linkLabel: link?.label ?? "Resource",
      linkNote: link?.note ?? null,
      score: match.score,
    }
  })
}

function buildDeterministicAnswer(question: string, citations: AskLibraryCitation[]): string {
  if (citations.length === 0) {
    return "I couldn't find relevant matches in this scope. Try a broader question or remove filters."
  }

  const categories = Array.from(new Set(citations.map((citation) => citation.category)))
  const categoryText = categories.slice(0, 3).join(", ")

  const topReferences = citations
    .slice(0, 3)
    .map((citation) => `[${citation.index}] ${citation.linkLabel}`)
    .join(", ")

  return [
    `For "${question}", I found ${citations.length} relevant match${citations.length === 1 ? "" : "es"}${categoryText ? ` in ${categoryText}` : ""}.`,
    `Start with ${topReferences}.`,
  ].join(" ")
}

function extractAssistantText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return ""
  }

  const root = payload as {
    choices?: Array<{ message?: { content?: unknown } }>
  }
  const content = root.choices?.[0]?.message?.content

  if (typeof content === "string") {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part
        }

        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text
        }

        return ""
      })
      .join("\n")
  }

  return ""
}

async function generateAiAnswer(
  question: string,
  citations: AskLibraryCitation[]
): Promise<{ answer: string; model: string }> {
  const apiKey = getPerplexityApiKey()
  const model = DEFAULT_PERPLEXITY_MODEL

  const citationDigest = citations
    .map((citation) => {
      const details = [
        `[${citation.index}]`,
        `category=${citation.category}`,
        citation.tags.length > 0 ? `tags=${citation.tags.join(", ")}` : "",
        `label=${citation.linkLabel}`,
        citation.linkNote ? `note=${citation.linkNote}` : "",
        `url=${citation.linkUrl}`,
      ]
        .filter(Boolean)
        .join(" | ")

      return details
    })
    .join("\n")

  const response = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content:
            "You are a retrieval assistant for a developer's saved library. Answer only from provided citations. Every factual sentence must include a citation marker like [1]. Never invent facts or links.",
        },
        {
          role: "user",
          content: [
            `Question: ${question}`,
            "",
            "Citations:",
            citationDigest,
          ].join("\n"),
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `AI provider request failed (${response.status}). ${errorText || "No response body."}`
    )
  }

  const payload = (await response.json()) as unknown
  const assistantText = normalizeWhitespace(extractAssistantText(payload))
  if (!assistantText) {
    throw new Error("AI answer was empty.")
  }

  return {
    answer: assistantText,
    model,
  }
}

export async function askLibraryQuestion(
  input: AskLibraryInput
): Promise<AskLibraryResult> {
  const question = normalizeQuestion(input.question)
  const maxCitations = Math.min(
    MAX_CITATIONS,
    Math.max(1, input.maxCitations ?? DEFAULT_MAX_CITATIONS)
  )

  const tokens = tokenizeQuestion(question)
  const scoredMatches = input.resources
    .map((resource) => scoreResource(resource, tokens))
    .filter((item): item is ScoredMatch => item !== null)
    .sort((left, right) => right.score - left.score)

  const citations = toCitations(scoredMatches, maxCitations).filter(
    (citation) => citation.linkUrl.trim().length > 0
  )

  if (citations.length === 0) {
    return {
      question,
      answer: buildDeterministicAnswer(question, citations),
      citations,
      usedAi: false,
      model: null,
    }
  }

  if (input.useAi) {
    try {
      const aiResult = await generateAiAnswer(question, citations)
      return {
        question,
        answer: aiResult.answer,
        citations,
        usedAi: true,
        model: aiResult.model,
      }
    } catch {
      // Fall through to deterministic answer.
    }
  }

  return {
    question,
    answer: buildDeterministicAnswer(question, citations),
    citations,
    usedAi: false,
    model: null,
  }
}
