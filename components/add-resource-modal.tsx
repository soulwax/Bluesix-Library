"use client"

import { useState, useCallback } from "react"
import { CATEGORIES } from "@/lib/seed-data"
import type { ResourceCard, ResourceLink } from "@/lib/seed-data"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"

interface LinkInput {
  url: string
  label: string
  note: string
}

interface AddResourceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (resource: ResourceCard) => void
  editingResource?: ResourceCard | null
}

const EDITABLE_CATEGORIES = CATEGORIES.filter((c) => c !== "All")

export function AddResourceModal({
  open,
  onOpenChange,
  onSave,
  editingResource,
}: AddResourceModalProps) {
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [links, setLinks] = useState<LinkInput[]>([
    { url: "", label: "", note: "" },
  ])

  const resetForm = useCallback(() => {
    setCategory("")
    setCustomCategory("")
    setLinks([{ url: "", label: "", note: "" }])
  }, [])

  const initFromEditing = useCallback(() => {
    if (editingResource) {
      const cat = editingResource.category
      if (EDITABLE_CATEGORIES.includes(cat as (typeof EDITABLE_CATEGORIES)[number])) {
        setCategory(cat)
        setCustomCategory("")
      } else {
        setCategory("__custom__")
        setCustomCategory(cat)
      }
      setLinks(
        editingResource.links.map((l) => ({
          url: l.url,
          label: l.label,
          note: l.note ?? "",
        }))
      )
    } else {
      resetForm()
    }
  }, [editingResource, resetForm])

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      initFromEditing()
    }
    onOpenChange(nextOpen)
  }

  const addLink = () => {
    setLinks((prev) => [...prev, { url: "", label: "", note: "" }])
  }

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const updateLink = (index: number, field: keyof LinkInput, value: string) => {
    setLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    )
  }

  const resolvedCategory = category === "__custom__" ? customCategory.trim() : category
  const validLinks = links.filter((l) => l.url.trim() && l.label.trim())
  const canSave = resolvedCategory.length > 0 && validLinks.length > 0

  const handleSave = () => {
    if (!canSave) return

    const newLinks: ResourceLink[] = validLinks.map((l, i) => ({
      id: `link-${Date.now()}-${i}`,
      url: l.url.trim(),
      label: l.label.trim(),
      note: l.note.trim() || undefined,
    }))

    const resource: ResourceCard = {
      id: editingResource?.id ?? `res-${Date.now()}`,
      category: resolvedCategory,
      links: newLinks,
    }

    onSave(resource)
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingResource ? "Edit Resource" : "Add Resource"}
          </DialogTitle>
          <DialogDescription>
            {editingResource
              ? "Update the category and links for this resource card."
              : "Add a new resource card with links to your library."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-select">Category</Label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select a category...</option>
              {EDITABLE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">+ Custom category</option>
            </select>
            {category === "__custom__" && (
              <Input
                placeholder="Enter custom category name..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                autoFocus
              />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Links</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addLink}
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                Add link
              </Button>
            </div>

            {links.map((link, index) => (
              <div
                key={index}
                className="relative flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3"
              >
                {links.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="absolute right-2 top-2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove link ${index + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`link-label-${index}`} className="text-xs text-muted-foreground">
                      Label
                    </Label>
                    <Input
                      id={`link-label-${index}`}
                      placeholder="e.g. cppreference"
                      value={link.label}
                      onChange={(e) => updateLink(index, "label", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`link-url-${index}`} className="text-xs text-muted-foreground">
                      URL
                    </Label>
                    <Input
                      id={`link-url-${index}`}
                      type="url"
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => updateLink(index, "url", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`link-note-${index}`} className="text-xs text-muted-foreground">
                    Note (optional)
                  </Label>
                  <Input
                    id={`link-note-${index}`}
                    placeholder="Short description..."
                    value={link.note}
                    onChange={(e) => updateLink(index, "note", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {editingResource ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
