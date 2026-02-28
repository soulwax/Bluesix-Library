#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config();

const sql = neon(process.env.DATABASE_URL);

const indexes = [
  { name: "app_users_created_at_idx", sql: sql`CREATE INDEX IF NOT EXISTS "app_users_created_at_idx" ON "app_users" USING btree ("created_at")` },
  { name: "resource_cards_workspace_category_deleted_idx", sql: sql`CREATE INDEX IF NOT EXISTS "resource_cards_workspace_category_deleted_idx" ON "resource_cards" USING btree ("workspace_id","category_id","deleted_at")` },
  { name: "resource_cards_deleted_at_idx", sql: sql`CREATE INDEX IF NOT EXISTS "resource_cards_deleted_at_idx" ON "resource_cards" USING btree ("deleted_at")` },
  { name: "resource_links_url_idx", sql: sql`CREATE INDEX IF NOT EXISTS "resource_links_url_idx" ON "resource_links" USING btree (lower("url"))` },
];

console.log("Applying database indexes...\n");

for (const { name, sql: indexSql } of indexes) {
  try {
    await indexSql;
    console.log(`✓ Created index: ${name}`);
  } catch (error) {
    if (error.message?.includes("already exists")) {
      console.log(`→ Index already exists: ${name}`);
    } else {
      console.error(`✗ Failed to create index ${name}:`, error.message);
      process.exit(1);
    }
  }
}

console.log("\n✓ All indexes applied successfully!");
process.exit(0);
