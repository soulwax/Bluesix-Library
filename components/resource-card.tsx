"use client"

import { useMemo, useState } from "react"

import type { ResourceCard } from "@/lib/resources"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getTagToneClasses } from "@/lib/tag-styles"
import { ExternalLink, Pencil, Trash2 } from "lucide-react"

interface LinkPresentation {
  hostname: string | null
  faviconCandidates: string[]
}

function getLinkPresentation(url: string): LinkPresentation {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname

    return {
      hostname,
      faviconCandidates: [
        `${parsed.origin}/favicon.ico`,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
          hostname
        )}&sz=64`,
      ],
    }
  } catch {
    return {
      hostname: null,
      faviconCandidates: [],
    }
  }
}

function ResourceLinkCompactItem({
  label,
  note,
  url,
}: {
  label: string
  note?: string | null
  url: string
}) {
  const linkPresentation = useMemo(() => getLinkPresentation(url), [url])
  const [faviconIndex, setFaviconIndex] = useState(0)
  const [faviconUnavailable, setFaviconUnavailable] = useState(false)

  const faviconSrc = linkPresentation.faviconCandidates[faviconIndex]

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/link flex items-start gap-2 rounded-md border border-border/70 bg-secondary/20 p-2 transition-colors hover:border-primary/30 hover:bg-secondary/40"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-background">
        {!faviconUnavailable && faviconSrc ? (
          <img
            src={faviconSrc}
            alt=""
            className="h-4 w-4"
            loading="lazy"
            onError={() => {
              if (
                faviconIndex <
                linkPresentation.faviconCandidates.length - 1
              ) {
                setFaviconIndex((previous) => previous + 1)
                return
              }

              setFaviconUnavailable(true)
            }}
          />
        ) : (
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover/link:text-primary" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className="truncate font-mono text-sm text-foreground transition-colors group-hover/link:text-primary">
            {label}
          </span>
          {linkPresentation.hostname ? (
            <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
              {linkPresentation.hostname}
            </span>
          ) : null}
        </div>
        {note ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {note}
          </p>
        ) : null}
      </div>
    </a>
  )
}

interface ResourceCardProps {
  resource: ResourceCard
  categorySymbol?: string | null
  onDelete: (id: string) => void
  onEdit: (resource: ResourceCard) => void
  onHoverChange?: (resource: ResourceCard | null) => void
  isDeleting?: boolean
  canManage?: boolean
}

export function ResourceCardItem({
  resource,
  categorySymbol,
  onDelete,
  onEdit,
  onHoverChange,
  isDeleting = false,
  canManage = false,
}: ResourceCardProps) {
  return (
    <div
      className="group flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
      onMouseEnter={() => onHoverChange?.(resource)}
      onMouseLeave={() => onHoverChange?.(null)}
    >
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="secondary" className="font-medium">
          {categorySymbol ? `${categorySymbol} ` : ""}
          {resource.category}
        </Badge>
        {canManage ? (
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(resource)}
              aria-label={`Edit ${resource.category} resource card`}
              disabled={isDeleting}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(resource.id)}
              aria-label={`Delete ${resource.category} resource card`}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      {resource.tags.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {resource.tags.map((tag) => (
            <Badge
              key={`${resource.id}-${tag}`}
              variant="outline"
              className={getTagToneClasses(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <ul className="flex flex-col gap-2.5" role="list">
        {resource.links.map((link) => (
          <li key={link.id}>
            <ResourceLinkCompactItem
              label={link.label}
              note={link.note}
              url={link.url}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
