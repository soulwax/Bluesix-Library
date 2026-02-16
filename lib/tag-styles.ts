const COMMON_TAG_TONE_BY_KEY: Record<string, string> = {
  javascript: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  typescript: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  python: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rust: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  go: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "c++": "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  csharp: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  c: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  java: "bg-red-500/15 text-red-300 border-red-500/30",
  kotlin: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  swift: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  php: "bg-indigo-400/15 text-indigo-200 border-indigo-400/30",
  ruby: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  postgres: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  postgresql: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  mysql: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  mongodb: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  graphql: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  docker: "bg-blue-400/15 text-blue-200 border-blue-400/30",
  kubernetes: "bg-cyan-400/15 text-cyan-200 border-cyan-400/30",
  aws: "bg-orange-400/15 text-orange-200 border-orange-400/30",
  gcp: "bg-blue-500/15 text-blue-200 border-blue-500/30",
  azure: "bg-blue-600/15 text-blue-200 border-blue-600/30",
}

function normalizeTagKey(tag: string): string {
  return tag.trim().toLowerCase()
}

export function getTagToneClasses(tag: string): string {
  const key = normalizeTagKey(tag)
  return (
    COMMON_TAG_TONE_BY_KEY[key] ??
    "bg-secondary text-secondary-foreground border-border"
  )
}

