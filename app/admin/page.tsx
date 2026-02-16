"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"

import type { ResourceAuditLogEntry, ResourceCard } from "@/lib/resources"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Search,
  Trash2,
} from "lucide-react"
import { Toaster, toast } from "sonner"

interface ApiErrorResponse {
  error?: string
  mode?: "database" | "mock"
}

interface AdminResourcesResponse extends ApiErrorResponse {
  mode?: "database" | "mock"
  resources?: ResourceCard[]
}

interface ResourceResponse extends ApiErrorResponse {
  mode?: "database" | "mock"
  resource?: ResourceCard
}

interface AuditLogsResponse extends ApiErrorResponse {
  mode?: "database" | "mock"
  logs?: ResourceAuditLogEntry[]
}

type StatusFilter = "all" | "active" | "archived"
type SortOption =
  | "category-asc"
  | "category-desc"
  | "links-desc"
  | "links-asc"
  | "archived-newest"
  | "archived-oldest"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const AUDIT_PAGE_SIZE = 12
const AUDIT_FETCH_LIMIT = 200

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

function formatDeletedAt(deletedAt: string | null | undefined): string {
  if (!deletedAt) {
    return "-"
  }

  const date = new Date(deletedAt)
  if (Number.isNaN(date.getTime())) {
    return deletedAt
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function isArchived(resource: ResourceCard): boolean {
  return Boolean(resource.deletedAt)
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) {
    return -1
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? -1 : parsed
}

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids)]
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [resources, setResources] = useState<ResourceCard[]>([])
  const [auditLogs, setAuditLogs] = useState<ResourceAuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuditLoading, setIsAuditLoading] = useState(true)
  const [actionResourceId, setActionResourceId] = useState<string | null>(null)
  const [isBulkActing, setIsBulkActing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortOption, setSortOption] = useState<SortOption>("category-asc")
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25)
  const [resourcePage, setResourcePage] = useState(1)
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([])
  const [auditPage, setAuditPage] = useState(1)

  const isAdmin = Boolean(session?.user?.isAdmin)

  const resourcesById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources]
  )

  useEffect(() => {
    setSelectedResourceIds((previous) =>
      previous.filter((resourceId) => resourcesById.has(resourceId))
    )
  }, [resourcesById])

  const totalResources = resources.length
  const archivedCount = useMemo(
    () => resources.filter((resource) => isArchived(resource)).length,
    [resources]
  )
  const activeCount = totalResources - archivedCount

  const filteredResources = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    const filtered = resources.filter((resource) => {
      if (statusFilter === "active" && isArchived(resource)) {
        return false
      }

      if (statusFilter === "archived" && !isArchived(resource)) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      if (resource.category.toLowerCase().includes(normalizedSearch)) {
        return true
      }

      return resource.links.some(
        (link) =>
          link.label.toLowerCase().includes(normalizedSearch) ||
          link.url.toLowerCase().includes(normalizedSearch) ||
          link.note?.toLowerCase().includes(normalizedSearch)
      )
    })

    filtered.sort((left, right) => {
      const categorySort = left.category.localeCompare(right.category, undefined, {
        sensitivity: "base",
      })

      switch (sortOption) {
        case "category-asc":
          return categorySort
        case "category-desc":
          return -categorySort
        case "links-desc":
          return right.links.length - left.links.length || categorySort
        case "links-asc":
          return left.links.length - right.links.length || categorySort
        case "archived-newest":
          return (
            toTimestamp(right.deletedAt) - toTimestamp(left.deletedAt) ||
            categorySort
          )
        case "archived-oldest":
          return (
            toTimestamp(left.deletedAt) - toTimestamp(right.deletedAt) ||
            categorySort
          )
        default:
          return categorySort
      }
    })

    return filtered
  }, [resources, searchQuery, sortOption, statusFilter])

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    sortOption !== "category-asc"

  const resourcePageCount = Math.max(1, Math.ceil(filteredResources.length / pageSize))

  useEffect(() => {
    setResourcePage(1)
  }, [pageSize, searchQuery, sortOption, statusFilter])

  useEffect(() => {
    if (resourcePage > resourcePageCount) {
      setResourcePage(resourcePageCount)
    }
  }, [resourcePage, resourcePageCount])

  const pagedResources = useMemo(() => {
    const start = (resourcePage - 1) * pageSize
    const end = start + pageSize
    return filteredResources.slice(start, end)
  }, [filteredResources, pageSize, resourcePage])

  const selectedIdSet = useMemo(
    () => new Set(selectedResourceIds),
    [selectedResourceIds]
  )

  const pagedResourceIds = useMemo(
    () => pagedResources.map((resource) => resource.id),
    [pagedResources]
  )

  const selectedOnPageCount = useMemo(
    () =>
      pagedResourceIds.reduce(
        (count, resourceId) => count + (selectedIdSet.has(resourceId) ? 1 : 0),
        0
      ),
    [pagedResourceIds, selectedIdSet]
  )

  const pageSelectState: boolean | "indeterminate" =
    pagedResourceIds.length === 0
      ? false
      : selectedOnPageCount === pagedResourceIds.length
        ? true
        : selectedOnPageCount > 0
          ? "indeterminate"
          : false

  const selectedActiveIds = useMemo(
    () =>
      selectedResourceIds.filter((resourceId) => {
        const resource = resourcesById.get(resourceId)
        return resource ? !isArchived(resource) : false
      }),
    [resourcesById, selectedResourceIds]
  )

  const selectedArchivedIds = useMemo(
    () =>
      selectedResourceIds.filter((resourceId) => {
        const resource = resourcesById.get(resourceId)
        return resource ? isArchived(resource) : false
      }),
    [resourcesById, selectedResourceIds]
  )

  const auditPageCount = Math.max(1, Math.ceil(auditLogs.length / AUDIT_PAGE_SIZE))

  useEffect(() => {
    if (auditPage > auditPageCount) {
      setAuditPage(auditPageCount)
    }
  }, [auditPage, auditPageCount])

  const pagedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE
    const end = start + AUDIT_PAGE_SIZE
    return auditLogs.slice(start, end)
  }, [auditLogs, auditPage])

  const resetFilters = useCallback(() => {
    setSearchQuery("")
    setStatusFilter("all")
    setSortOption("category-asc")
  }, [])

  const fetchResources = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await fetch("/api/admin/resources", { cache: "no-store" })
      const payload = await readJson<AdminResourcesResponse>(response)

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load admin resources.")
      }

      setResources(payload?.resources ?? [])
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load admin resources."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchAuditLogs = useCallback(async () => {
    setIsAuditLoading(true)
    setAuditError(null)

    try {
      const response = await fetch(`/api/admin/audit?limit=${AUDIT_FETCH_LIMIT}`, {
        cache: "no-store",
      })
      const payload = await readJson<AuditLogsResponse>(response)

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load audit logs.")
      }

      setAuditLogs(payload?.logs ?? [])
    } catch (error) {
      setAuditError(
        error instanceof Error ? error.message : "Could not load audit logs."
      )
    } finally {
      setIsAuditLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "authenticated" || !isAdmin) {
      setIsLoading(false)
      setIsAuditLoading(false)
      return
    }

    void fetchResources()
    void fetchAuditLogs()
  }, [fetchAuditLogs, fetchResources, isAdmin, status])

  const requestArchive = useCallback(async (resourceId: string) => {
    const response = await fetch(`/api/resources/${resourceId}`, {
      method: "DELETE",
    })
    const payload = await readJson<ApiErrorResponse>(response)

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to archive resource.")
    }
  }, [])

  const requestRestore = useCallback(async (resourceId: string) => {
    const response = await fetch(`/api/admin/resources/${resourceId}/restore`, {
      method: "POST",
    })
    const payload = await readJson<ResourceResponse>(response)

    if (!response.ok || !payload?.resource) {
      throw new Error(payload?.error ?? "Failed to restore resource.")
    }

    return payload.resource
  }, [])

  const archiveResource = useCallback(
    async (resourceId: string) => {
      if (isBulkActing || actionResourceId !== null) {
        return
      }

      setActionResourceId(resourceId)

      try {
        await requestArchive(resourceId)

        const archivedAt = new Date().toISOString()
        setResources((prev) =>
          prev.map((resource) =>
            resource.id === resourceId
              ? { ...resource, deletedAt: archivedAt }
              : resource
          )
        )
        setSelectedResourceIds((prev) =>
          prev.filter((selectedId) => selectedId !== resourceId)
        )

        toast.success("Resource archived")
        void fetchAuditLogs()
      } catch (error) {
        toast.error("Archive failed", {
          description:
            error instanceof Error ? error.message : "Could not archive resource.",
        })
      } finally {
        setActionResourceId(null)
      }
    },
    [actionResourceId, fetchAuditLogs, isBulkActing, requestArchive]
  )

  const restoreResource = useCallback(
    async (resourceId: string) => {
      if (isBulkActing || actionResourceId !== null) {
        return
      }

      setActionResourceId(resourceId)

      try {
        const restored = await requestRestore(resourceId)
        setResources((prev) =>
          prev.map((resource) => (resource.id === restored.id ? restored : resource))
        )
        setSelectedResourceIds((prev) =>
          prev.filter((selectedId) => selectedId !== resourceId)
        )

        toast.success("Resource restored")
        void fetchAuditLogs()
      } catch (error) {
        toast.error("Restore failed", {
          description:
            error instanceof Error ? error.message : "Could not restore resource.",
        })
      } finally {
        setActionResourceId(null)
      }
    },
    [actionResourceId, fetchAuditLogs, isBulkActing, requestRestore]
  )

  const archiveSelected = useCallback(async () => {
    if (isBulkActing || actionResourceId !== null) {
      return
    }

    if (selectedActiveIds.length === 0) {
      toast("No active resources selected.")
      return
    }

    setIsBulkActing(true)

    try {
      const settled = await Promise.allSettled(
        selectedActiveIds.map(async (resourceId) => {
          await requestArchive(resourceId)
          return resourceId
        })
      )

      const archivedAt = new Date().toISOString()
      const succeededIds: string[] = []
      let firstError: string | null = null

      for (const result of settled) {
        if (result.status === "fulfilled") {
          succeededIds.push(result.value)
        } else if (!firstError) {
          firstError =
            result.reason instanceof Error
              ? result.reason.message
              : "Unexpected error."
        }
      }

      if (succeededIds.length > 0) {
        const succeededSet = new Set(succeededIds)
        setResources((prev) =>
          prev.map((resource) =>
            succeededSet.has(resource.id)
              ? { ...resource, deletedAt: archivedAt }
              : resource
          )
        )
        setSelectedResourceIds((prev) =>
          prev.filter((resourceId) => !succeededSet.has(resourceId))
        )

        toast.success(
          `Archived ${succeededIds.length} resource${succeededIds.length === 1 ? "" : "s"}.`
        )
        void fetchAuditLogs()
      }

      const failedCount = settled.length - succeededIds.length
      if (failedCount > 0) {
        toast.error(
          `${failedCount} resource${failedCount === 1 ? "" : "s"} failed to archive.`,
          { description: firstError ?? undefined }
        )
      }
    } finally {
      setIsBulkActing(false)
    }
  }, [
    actionResourceId,
    fetchAuditLogs,
    isBulkActing,
    requestArchive,
    selectedActiveIds,
  ])

  const restoreSelected = useCallback(async () => {
    if (isBulkActing || actionResourceId !== null) {
      return
    }

    if (selectedArchivedIds.length === 0) {
      toast("No archived resources selected.")
      return
    }

    setIsBulkActing(true)

    try {
      const settled = await Promise.allSettled(
        selectedArchivedIds.map(async (resourceId) => {
          const restored = await requestRestore(resourceId)
          return restored
        })
      )

      const restoredMap = new Map<string, ResourceCard>()
      let firstError: string | null = null

      for (const result of settled) {
        if (result.status === "fulfilled") {
          restoredMap.set(result.value.id, result.value)
        } else if (!firstError) {
          firstError =
            result.reason instanceof Error
              ? result.reason.message
              : "Unexpected error."
        }
      }

      if (restoredMap.size > 0) {
        setResources((prev) =>
          prev.map((resource) => restoredMap.get(resource.id) ?? resource)
        )
        setSelectedResourceIds((prev) =>
          prev.filter((resourceId) => !restoredMap.has(resourceId))
        )

        toast.success(
          `Restored ${restoredMap.size} resource${restoredMap.size === 1 ? "" : "s"}.`
        )
        void fetchAuditLogs()
      }

      const failedCount = settled.length - restoredMap.size
      if (failedCount > 0) {
        toast.error(
          `${failedCount} resource${failedCount === 1 ? "" : "s"} failed to restore.`,
          { description: firstError ?? undefined }
        )
      }
    } finally {
      setIsBulkActing(false)
    }
  }, [
    actionResourceId,
    fetchAuditLogs,
    isBulkActing,
    requestRestore,
    selectedArchivedIds,
  ])

  const togglePageSelection = useCallback(
    (checked: boolean) => {
      setSelectedResourceIds((previous) => {
        const next = new Set(previous)

        for (const resourceId of pagedResourceIds) {
          if (checked) {
            next.add(resourceId)
          } else {
            next.delete(resourceId)
          }
        }

        return [...next]
      })
    },
    [pagedResourceIds]
  )

  const toggleResourceSelection = useCallback((resourceId: string, checked: boolean) => {
    setSelectedResourceIds((previous) => {
      if (checked) {
        return dedupeIds([...previous, resourceId])
      }

      return previous.filter((selectedId) => selectedId !== resourceId)
    })
  }, [])

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Checking permissions...
      </div>
    )
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Sign in to access admin tools.</p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">Back to Library</span>
          </Link>
        </Button>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">
          You are signed in as read-only.
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">Back to Library</span>
          </Link>
        </Button>
      </div>
    )
  }

  const pageStartIndex =
    filteredResources.length === 0 ? 0 : (resourcePage - 1) * pageSize + 1
  const pageEndIndex = Math.min(resourcePage * pageSize, filteredResources.length)
  const auditStartIndex =
    auditLogs.length === 0 ? 0 : (auditPage - 1) * AUDIT_PAGE_SIZE + 1
  const auditEndIndex = Math.min(auditPage * AUDIT_PAGE_SIZE, auditLogs.length)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            Bulk moderation, paged tables, and reversible actions.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">Back to Library</span>
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{totalResources}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            All records, including archived ones.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl">{activeCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Visible in the public library.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Archived</CardDescription>
            <CardTitle className="text-2xl">{archivedCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Soft-deleted and recoverable.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Search by category or link, then refine status and sort.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search resources..."
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="archived">Archived only</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortOption}
            onValueChange={(value) => setSortOption(value as SortOption)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category-asc">Category A-Z</SelectItem>
              <SelectItem value="category-desc">Category Z-A</SelectItem>
              <SelectItem value="links-desc">Most links</SelectItem>
              <SelectItem value="links-asc">Fewest links</SelectItem>
              <SelectItem value="archived-newest">Archived newest</SelectItem>
              <SelectItem value="archived-oldest">Archived oldest</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <FilterX className="h-4 w-4" />
            <span className="ml-2">Reset</span>
          </Button>
        </CardContent>
      </Card>

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Could not load resources</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void fetchResources()} disabled={isLoading}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resource Records</CardTitle>
          <CardDescription>
            {filteredResources.length} shown
            {hasActiveFilters ? " with filters applied" : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {selectedResourceIds.length} selected
              {selectedResourceIds.length > 0
                ? ` · ${selectedActiveIds.length} active · ${selectedArchivedIds.length} archived`
                : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedResourceIds([])}
                disabled={
                  selectedResourceIds.length === 0 ||
                  isBulkActing ||
                  actionResourceId !== null
                }
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void archiveSelected()}
                disabled={
                  selectedActiveIds.length === 0 ||
                  isBulkActing ||
                  actionResourceId !== null
                }
              >
                <Trash2 className="h-4 w-4" />
                <span className="ml-2">Archive Selected ({selectedActiveIds.length})</span>
              </Button>
              <Button
                size="sm"
                onClick={() => void restoreSelected()}
                disabled={
                  selectedArchivedIds.length === 0 ||
                  isBulkActing ||
                  actionResourceId !== null
                }
              >
                <ArchiveRestore className="h-4 w-4" />
                <span className="ml-2">
                  Restore Selected ({selectedArchivedIds.length})
                </span>
              </Button>
            </div>
          </div>

          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading resources...</p>
          ) : filteredResources.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No resources match the current filters.
            </p>
          ) : (
            <>
              <div className="max-h-[560px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="w-12 bg-card">
                        <Checkbox
                          checked={pageSelectState}
                          onCheckedChange={(checked) =>
                            togglePageSelection(checked === true)
                          }
                          aria-label="Select all rows on this page"
                          disabled={isBulkActing || actionResourceId !== null}
                        />
                      </TableHead>
                      <TableHead className="bg-card">Category</TableHead>
                      <TableHead className="w-20 bg-card">Links</TableHead>
                      <TableHead className="w-24 bg-card">Status</TableHead>
                      <TableHead className="w-56 bg-card">Archived At</TableHead>
                      <TableHead className="w-44 bg-card text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedResources.map((resource) => {
                      const archived = isArchived(resource)
                      const isBusy = actionResourceId !== null || isBulkActing

                      return (
                        <TableRow
                          key={resource.id}
                          className={archived ? "opacity-80" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIdSet.has(resource.id)}
                              onCheckedChange={(checked) =>
                                toggleResourceSelection(resource.id, checked === true)
                              }
                              aria-label={`Select ${resource.category}`}
                              disabled={isBusy}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-medium">
                                {resource.category}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {resource.links.length > 0
                                  ? resource.links
                                      .slice(0, 2)
                                      .map((link) => link.label)
                                      .join(" · ")
                                  : "No links"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {resource.links.length}
                          </TableCell>
                          <TableCell>
                            {archived ? (
                              <Badge variant="outline">archived</Badge>
                            ) : (
                              <Badge variant="secondary">active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDeletedAt(resource.deletedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              {archived ? (
                                <Button
                                  size="sm"
                                  onClick={() => void restoreResource(resource.id)}
                                  disabled={isBusy}
                                >
                                  <ArchiveRestore className="h-4 w-4" />
                                  <span className="ml-2">
                                    {isBusy ? "Restoring..." : "Restore"}
                                  </span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void archiveResource(resource.id)}
                                  disabled={isBusy}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="ml-2">
                                    {isBusy ? "Archiving..." : "Archive"}
                                  </span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {pageStartIndex} to {pageEndIndex} of {filteredResources.length}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) =>
                      setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
                    }
                  >
                    <SelectTrigger className="h-8 w-[118px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Page {resourcePage} of {resourcePageCount}
                  </p>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setResourcePage((previous) => previous - 1)}
                    disabled={resourcePage <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setResourcePage((previous) => previous + 1)}
                    disabled={resourcePage >= resourcePageCount}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audit Log</CardTitle>
          <CardDescription>
            Track archive and restore operations with actor attribution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {auditError ? (
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted-foreground">{auditError}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void fetchAuditLogs()}
                disabled={isAuditLoading}
              >
                Retry
              </Button>
            </div>
          ) : isAuditLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading audit log...</p>
          ) : auditLogs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No audit events yet.
            </p>
          ) : (
            <>
              <div className="max-h-[360px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="w-56 bg-card">When</TableHead>
                      <TableHead className="w-32 bg-card">Action</TableHead>
                      <TableHead className="bg-card">Resource</TableHead>
                      <TableHead className="w-72 bg-card">Actor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTimestamp(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          {log.action === "archived" ? (
                            <Badge variant="destructive">archived</Badge>
                          ) : (
                            <Badge variant="secondary">restored</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">
                              {log.resourceCategory}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {log.resourceId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.actorIdentifier}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {auditStartIndex} to {auditEndIndex} of {auditLogs.length}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Page {auditPage} of {auditPageCount}
                  </p>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setAuditPage((previous) => previous - 1)}
                    disabled={auditPage <= 1}
                    aria-label="Previous audit page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setAuditPage((previous) => previous + 1)}
                    disabled={auditPage >= auditPageCount}
                    aria-label="Next audit page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Toaster position="bottom-right" theme="dark" />
    </div>
  )
}
