export interface ResourceLink {
  id: string
  url: string
  label: string
  note?: string
}

export interface ResourceCard {
  id: string
  category: string
  links: ResourceLink[]
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

let _id = 0
function uid() {
  _id++
  return `res-${_id}`
}

function lid() {
  _id++
  return `link-${_id}`
}

export const SEED_RESOURCES: ResourceCard[] = [
  {
    id: uid(),
    category: "C++",
    links: [
      { id: lid(), url: "https://en.cppreference.com", label: "cppreference.com", note: "The definitive C++ reference" },
      { id: lid(), url: "https://godbolt.org", label: "Compiler Explorer", note: "Inspect assembly output live" },
      { id: lid(), url: "https://isocpp.org", label: "isocpp.org", note: "ISO C++ standards & news" },
    ],
  },
  {
    id: uid(),
    category: "C++",
    links: [
      { id: lid(), url: "https://www.learncpp.com", label: "LearnCpp.com", note: "Modern C++ tutorials" },
      { id: lid(), url: "https://cppinsights.io", label: "C++ Insights", note: "See what the compiler sees" },
    ],
  },
  {
    id: uid(),
    category: "Rust",
    links: [
      { id: lid(), url: "https://doc.rust-lang.org/book/", label: "The Rust Book", note: "Official language guide" },
      { id: lid(), url: "https://play.rust-lang.org", label: "Rust Playground", note: "Run Rust in the browser" },
      { id: lid(), url: "https://crates.io", label: "crates.io", note: "Rust package registry" },
    ],
  },
  {
    id: uid(),
    category: "Go",
    links: [
      { id: lid(), url: "https://go.dev/doc/", label: "Go Docs", note: "Official documentation" },
      { id: lid(), url: "https://go.dev/play/", label: "Go Playground" },
      { id: lid(), url: "https://gobyexample.com", label: "Go by Example", note: "Hands-on introduction" },
    ],
  },
  {
    id: uid(),
    category: "TypeScript",
    links: [
      { id: lid(), url: "https://www.typescriptlang.org/docs/", label: "TS Handbook", note: "Official TypeScript docs" },
      { id: lid(), url: "https://www.typescriptlang.org/play", label: "TS Playground", note: "Online TS compiler" },
      { id: lid(), url: "https://type-challenges.github.io", label: "Type Challenges", note: "Practice type-level TS" },
    ],
  },
  {
    id: uid(),
    category: "Python",
    links: [
      { id: lid(), url: "https://docs.python.org/3/", label: "Python 3 Docs", note: "Standard library reference" },
      { id: lid(), url: "https://realpython.com", label: "Real Python", note: "Tutorials & articles" },
    ],
  },
  {
    id: uid(),
    category: "Graphics / GPU",
    links: [
      { id: lid(), url: "https://learnopengl.com", label: "LearnOpenGL", note: "Modern OpenGL tutorials" },
      { id: lid(), url: "https://vulkan-tutorial.com", label: "Vulkan Tutorial", note: "Step-by-step Vulkan guide" },
      { id: lid(), url: "https://shader-tutorial.dev", label: "Shader Tutorial", note: "GLSL shader fundamentals" },
    ],
  },
  {
    id: uid(),
    category: "Graphics / GPU",
    links: [
      { id: lid(), url: "https://www.shadertoy.com", label: "Shadertoy", note: "Shader experiments & gallery" },
      { id: lid(), url: "https://gpuopen.com", label: "GPUOpen", note: "AMD GPU tools & resources" },
    ],
  },
  {
    id: uid(),
    category: "Game Engines",
    links: [
      { id: lid(), url: "https://docs.godotengine.org", label: "Godot Docs", note: "Official Godot documentation" },
      { id: lid(), url: "https://gdquest.com", label: "GDQuest", note: "Godot tutorials & courses" },
      { id: lid(), url: "https://godotshaders.com", label: "Godot Shaders", note: "Community shader library" },
    ],
  },
  {
    id: uid(),
    category: "Game Engines",
    links: [
      { id: lid(), url: "https://bevyengine.org", label: "Bevy Engine", note: "Rust-based game engine" },
      { id: lid(), url: "https://www.raylib.com", label: "Raylib", note: "Simple game programming library" },
    ],
  },
  {
    id: uid(),
    category: "Math",
    links: [
      { id: lid(), url: "https://www.3blue1brown.com", label: "3Blue1Brown", note: "Visual math explanations" },
      { id: lid(), url: "https://mathworld.wolfram.com", label: "MathWorld", note: "Wolfram math encyclopedia" },
      { id: lid(), url: "https://www.desmos.com/calculator", label: "Desmos", note: "Graphing calculator" },
    ],
  },
  {
    id: uid(),
    category: "Math",
    links: [
      { id: lid(), url: "https://immersivemath.com", label: "Immersive Math", note: "Interactive linear algebra" },
      { id: lid(), url: "https://betterexplained.com", label: "Better Explained", note: "Intuitive math insights" },
    ],
  },
  {
    id: uid(),
    category: "General",
    links: [
      { id: lid(), url: "https://news.ycombinator.com", label: "Hacker News", note: "Tech news & discussion" },
      { id: lid(), url: "https://lobste.rs", label: "Lobsters", note: "Computing-focused link aggregator" },
      { id: lid(), url: "https://devdocs.io", label: "DevDocs", note: "Unified API documentation" },
    ],
  },
  {
    id: uid(),
    category: "Networking",
    links: [
      { id: lid(), url: "https://beej.us/guide/bgnet/", label: "Beej's Guide", note: "Network programming in C" },
      { id: lid(), url: "https://www.wireguard.com", label: "WireGuard", note: "Modern VPN protocol docs" },
    ],
  },
  {
    id: uid(),
    category: "DevOps",
    links: [
      { id: lid(), url: "https://docs.docker.com", label: "Docker Docs", note: "Container platform reference" },
      { id: lid(), url: "https://nixos.org/manual/nix/stable/", label: "Nix Manual", note: "Reproducible builds & packages" },
      { id: lid(), url: "https://www.ansible.com/docs", label: "Ansible Docs", note: "Automation & config management" },
    ],
  },
  {
    id: uid(),
    category: "Databases",
    links: [
      { id: lid(), url: "https://www.postgresql.org/docs/", label: "PostgreSQL Docs", note: "Official Postgres reference" },
      { id: lid(), url: "https://redis.io/docs", label: "Redis Docs", note: "In-memory data store" },
      { id: lid(), url: "https://use-the-index-luke.com", label: "Use The Index, Luke", note: "SQL indexing & tuning" },
    ],
  },
  {
    id: uid(),
    category: "Security",
    links: [
      { id: lid(), url: "https://owasp.org", label: "OWASP", note: "Web application security" },
      { id: lid(), url: "https://cryptopals.com", label: "Cryptopals", note: "Crypto challenges" },
    ],
  },
  {
    id: uid(),
    category: "General",
    links: [
      { id: lid(), url: "https://missing.csail.mit.edu", label: "Missing Semester", note: "MIT - practical dev skills" },
      { id: lid(), url: "https://roadmap.sh", label: "roadmap.sh", note: "Developer roadmaps" },
    ],
  },
]
