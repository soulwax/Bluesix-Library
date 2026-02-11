"use client"

import { useState, useMemo, useCallback } from "react"
import { SEED_RESOURCES } from "@/lib/seed-data"
import type { ResourceCard, Category } from "@/lib/seed-data"
import { CategorySidebar } from "@/components/category-sidebar"
import { ResourceCardItem } from "@/components/resource-card"
import { AddResourceModal } from "@/components/add-resource-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Toaster, toast } from "sonner"
import { Search, Plus, Menu, BookOpen, FolderOpen } from "lucide-react"

export default function Page() {
  const [resources, setResources] = useState<ResourceCard[]>(SEED_RESOURCES)
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<ResourceCard | null>(
    null
  )

  const resourceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of resources) {
      counts[r.category] = (counts[r.category] ?? 0) + 1
    }
    return counts
  }, [resources])

  const filteredResources = useMemo(() => {
    let result = resources

    if (activeCategory !== "All") {
      result = result.filter((r) => r.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.category.toLowerCase().includes(q) ||
          r.links.some(
            (l) =>
              l.label.toLowerCase().includes(q) ||
              l.url.toLowerCase().includes(q) ||
              l.note?.toLowerCase().includes(q)
          )
      )
    }

    return result
  }, [resources, activeCategory, searchQuery])

  const handleSave = useCallback(
    (resource: ResourceCard) => {
      setResources((prev) => {
        const existingIndex = prev.findIndex((r) => r.id === resource.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = resource
          return updated
        }
        return [resource, ...prev]
      })
      const wasEditing = editingResource !== null
      setEditingResource(null)
      toast.success(wasEditing ? "Resource updated" : "Resource added", {
        description: `${resource.category} card saved to your library.`,
      })
    },
    [editingResource]
  )

  const handleDelete = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id))
    toast.success("Resource removed", {
      description: "The card has been deleted from your library.",
    })
  }, [])

  const handleEdit = useCallback((resource: ResourceCard) => {
    setEditingResource(resource)
    setModalOpen(true)
  }, [])

  const handleModalOpenChange = useCallback((open: boolean) => {
    setModalOpen(open)
    if (!open) setEditingResource(null)
  }, [])

  const totalLinks = useMemo(
    () => resources.reduce((acc, r) => acc + r.links.length, 0),
    [resources]
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open category menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-semibold leading-tight text-foreground">
              DevVault
            </h1>
            <p className="text-xs text-muted-foreground">
              {resources.length} cards &middot; {totalLinks} links
            </p>
          </div>
        </div>

        <div className="relative mx-4 max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search resources"
          />
        </div>

        <Button
          onClick={() => {
            setEditingResource(null)
            setModalOpen(true)
          }}
          className="ml-auto gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Resource</span>
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className="hidden w-60 shrink-0 border-r border-border bg-card lg:block"
          aria-label="Category navigation"
        >
          <CategorySidebar
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            resourceCounts={resourceCounts}
          />
        </aside>

        {/* Mobile sidebar (sheet) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle>Categories</SheetTitle>
              <SheetDescription className="sr-only">
                Filter resources by category
              </SheetDescription>
            </SheetHeader>
            <CategorySidebar
              activeCategory={activeCategory}
              onCategoryChange={(cat) => {
                setActiveCategory(cat)
                setSidebarOpen(false)
              }}
              resourceCounts={resourceCounts}
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main
          className="flex-1 overflow-y-auto p-4 lg:p-6"
          aria-label="Resource cards"
        >
          {filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <FolderOpen className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {searchQuery ? "No results found" : "No resources yet"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchQuery
                    ? `Nothing matches "${searchQuery}". Try a different search.`
                    : "Add your first resource to get started!"}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  onClick={() => {
                    setEditingResource(null)
                    setModalOpen(true)
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Resource
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredResources.map((resource) => (
                <ResourceCardItem
                  key={resource.id}
                  resource={resource}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <AddResourceModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        onSave={handleSave}
        editingResource={editingResource}
      />

      <Toaster position="bottom-right" theme="dark" />
    </div>
  )
}
