"use client"

import { cn } from "@/lib/utils"
import type { Category } from "@/lib/seed-data"
import { CATEGORIES } from "@/lib/seed-data"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Globe, Code2, Cpu, Gamepad2, Sigma, Network, Server, Database, ShieldCheck, Layers } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  All: Layers,
  General: Globe,
  "C++": Code2,
  Rust: Code2,
  Go: Code2,
  TypeScript: Code2,
  Python: Code2,
  "Graphics / GPU": Cpu,
  "Game Engines": Gamepad2,
  Math: Sigma,
  Networking: Network,
  DevOps: Server,
  Databases: Database,
  Security: ShieldCheck,
}

interface CategorySidebarProps {
  activeCategory: Category | "All"
  onCategoryChange: (cat: Category | "All") => void
  resourceCounts: Record<string, number>
}

export function CategorySidebar({
  activeCategory,
  onCategoryChange,
  resourceCounts,
}: CategorySidebarProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Categories
        </p>
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] ?? Globe
          const isActive = activeCategory === cat
          const count = cat === "All"
            ? Object.values(resourceCounts).reduce((a, b) => a + b, 0)
            : resourceCounts[cat] ?? 0

          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-secondary hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{cat}</span>
              <span
                className={cn(
                  "ml-auto font-mono text-xs tabular-nums",
                  isActive ? "text-primary" : "text-muted-foreground/60"
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
