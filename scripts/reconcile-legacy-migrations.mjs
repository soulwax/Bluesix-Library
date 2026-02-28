/**
 * Reconciles legacy Drizzle migration history for databases that were created
 * through runtime bootstrapping / db:push before migrate tracking was stable.
 *
 * It stamps only legacy baseline migrations (default: 0000-0017) into
 * drizzle.__drizzle_migrations so newer migrations still run normally.
 *
 * Usage:
 *   node scripts/reconcile-legacy-migrations.mjs
 *
 * Optional:
 *   DRIZZLE_LEGACY_BASELINE_INDEX=17 node scripts/reconcile-legacy-migrations.mjs
 */

import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"

const DEFAULT_BASELINE_INDEX = 17

function parseBaselineIndex() {
  const raw = process.env.DRIZZLE_LEGACY_BASELINE_INDEX?.trim()
  if (!raw) {
    return DEFAULT_BASELINE_INDEX
  }

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      `Invalid DRIZZLE_LEGACY_BASELINE_INDEX "${raw}". Expected non-negative integer.`
    )
  }
  return parsed
}

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, "..")

config({ path: join(root, ".env") })
if (existsSync(join(root, ".env.local"))) {
  config({ path: join(root, ".env.local"), override: true })
}

const url = process.env.DATABASE_URL_UNPOOLED?.trim()
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set in .env/.env.local")
  process.exit(1)
}

const baselineIndex = parseBaselineIndex()
const sql = neon(url)
const drizzleDir = join(root, "drizzle")

const migrationFiles = readdirSync(drizzleDir)
  .map((file) => {
    const match = /^(\d+).*\.sql$/.exec(file)
    if (!match) {
      return null
    }
    return {
      file,
      index: Number.parseInt(match[1], 10),
    }
  })
  .filter((entry) => entry !== null)
  .sort((left, right) => left.index - right.index)

const legacyFiles = migrationFiles.filter((entry) => entry.index <= baselineIndex)

await sql`CREATE SCHEMA IF NOT EXISTS drizzle`
await sql`
  CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`

const existing = await sql`SELECT hash FROM drizzle."__drizzle_migrations"`
const existingHashes = new Set(existing.map((row) => row.hash))

let stamped = 0
for (const entry of legacyFiles) {
  const content = readFileSync(join(drizzleDir, entry.file), "utf8")
  const hash = createHash("sha256").update(content).digest("hex")

  if (existingHashes.has(hash)) {
    continue
  }

  await sql`
    INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
    VALUES (${hash}, ${Date.now()})
  `
  existingHashes.add(hash)
  stamped += 1
}

if (stamped > 0) {
  console.log(
    `[db:migrate] Reconciled ${stamped} legacy migration(s) up to index ${baselineIndex}.`
  )
} else {
  console.log(
    `[db:migrate] Legacy migration history already reconciled up to index ${baselineIndex}.`
  )
}
