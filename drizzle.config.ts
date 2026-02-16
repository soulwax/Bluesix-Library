import "dotenv/config"
import { defineConfig } from "drizzle-kit"

if (!process.env.DATABASE_URL_UNPOOLED?.trim()) {
  throw new Error("DATABASE_URL_UNPOOLED is required for Drizzle commands.")
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db-schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED.trim(),
  },
  verbose: true,
  strict: true,
})
