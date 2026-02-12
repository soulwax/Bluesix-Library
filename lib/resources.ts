export interface ResourceLink {
  id: string
  url: string
  label: string
  note?: string | null
}

export interface ResourceCard {
  id: string
  category: string
  links: ResourceLink[]
}

export interface ResourceLinkInput {
  url: string
  label: string
  note?: string
}

export interface ResourceInput {
  category: string
  links: ResourceLinkInput[]
}

export const CATEGORIES = [
  "All",
  "General",
  "C++",
  "Rust",
  "Go",
  "TypeScript",
  "Python",
  "Graphics / GPU",
  "Game Engines",
  "Math",
  "Networking",
  "DevOps",
  "Databases",
  "Security",
] as const

export type Category = (typeof CATEGORIES)[number]
