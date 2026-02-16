import { relations, sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const resourceCards = pgTable(
  "resource_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: text("category").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "resource_cards_category_length_check",
      sql`char_length(${table.category}) <= 80`
    ),
    index("resource_cards_created_at_idx").on(table.createdAt),
  ]
)

export const resourceLinks = pgTable(
  "resource_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resourceCards.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label").notNull(),
    note: text("note"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("resource_links_url_length_check", sql`char_length(${table.url}) <= 2048`),
    check(
      "resource_links_label_length_check",
      sql`char_length(${table.label}) <= 120`
    ),
    check("resource_links_position_check", sql`${table.position} >= 0`),
    index("resource_links_resource_id_position_idx").on(
      table.resourceId,
      table.position
    ),
  ]
)

export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    isAdmin: boolean("is_admin").default(false).notNull(),
    isFirstAdmin: boolean("is_first_admin").default(false).notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("app_users_email_length_check", sql`char_length(${table.email}) <= 320`),
    uniqueIndex("app_users_email_lower_idx").on(sql`lower(${table.email})`),
    uniqueIndex("app_users_single_first_admin_idx")
      .on(table.isFirstAdmin)
      .where(sql`${table.isFirstAdmin} = true`),
  ]
)

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "email_verification_tokens_token_hash_length_check",
      sql`char_length(${table.tokenHash}) = 64`
    ),
    index("email_verification_tokens_user_id_idx").on(table.userId),
    index("email_verification_tokens_expires_at_idx").on(table.expiresAt),
    uniqueIndex("email_verification_tokens_token_hash_idx").on(table.tokenHash),
  ]
)

export const resourceAuditLogs = pgTable(
  "resource_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resourceCards.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    actorUserId: uuid("actor_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    actorIdentifier: text("actor_identifier").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "resource_audit_logs_action_check",
      sql`${table.action} IN ('archived', 'restored')`
    ),
    check(
      "resource_audit_logs_actor_identifier_length_check",
      sql`char_length(${table.actorIdentifier}) <= 320`
    ),
    index("resource_audit_logs_created_at_idx").on(table.createdAt),
    index("resource_audit_logs_resource_id_created_at_idx").on(
      table.resourceId,
      table.createdAt
    ),
    index("resource_audit_logs_actor_user_id_created_at_idx").on(
      table.actorUserId,
      table.createdAt
    ),
  ]
)

export const resourceCardsRelations = relations(resourceCards, ({ many }) => ({
  links: many(resourceLinks),
}))

export const resourceLinksRelations = relations(resourceLinks, ({ one }) => ({
  resource: one(resourceCards, {
    fields: [resourceLinks.resourceId],
    references: [resourceCards.id],
  }),
}))
