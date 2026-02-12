import { z } from "zod"

import type { ResourceInput, ResourceLinkInput } from "@/lib/resources"

const resourceLinkSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  label: z.string().trim().min(1).max(120),
  note: z.string().trim().max(280).optional(),
})

const resourceInputSchema = z.object({
  category: z.string().trim().min(1).max(80),
  links: z.array(resourceLinkSchema).min(1).max(100),
})

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim()

function normalizeUrl(rawUrl: string) {
  const normalizedUrl = rawUrl.trim()
  let parsed: URL

  try {
    parsed = new URL(normalizedUrl)
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["links", "url"],
        message: "Link URL must be a valid absolute URL.",
      },
    ])
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["links", "url"],
        message: "Link URL must use http or https.",
      },
    ])
  }

  return parsed.toString()
}

function normalizeLink(link: ResourceLinkInput): ResourceLinkInput {
  const note = link.note ? normalizeWhitespace(link.note) : undefined

  return {
    url: normalizeUrl(link.url),
    label: normalizeWhitespace(link.label),
    note: note && note.length > 0 ? note : undefined,
  }
}

export function parseResourceInput(payload: unknown): ResourceInput {
  const parsed = resourceInputSchema.parse(payload)

  return {
    category: normalizeWhitespace(parsed.category),
    links: parsed.links.map(normalizeLink),
  }
}
