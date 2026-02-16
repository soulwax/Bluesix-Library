CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_length_check" CHECK (char_length("app_users"."email") <= 320)
);
--> statement-breakpoint
CREATE TABLE "resource_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_cards_category_length_check" CHECK (char_length("resource_cards"."category") <= 80)
);
--> statement-breakpoint
CREATE TABLE "resource_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"note" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_links_url_length_check" CHECK (char_length("resource_links"."url") <= 2048),
	CONSTRAINT "resource_links_label_length_check" CHECK (char_length("resource_links"."label") <= 120),
	CONSTRAINT "resource_links_position_check" CHECK ("resource_links"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_resource_id_resource_cards_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_lower_idx" ON "app_users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "resource_cards_created_at_idx" ON "resource_cards" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "resource_links_resource_id_position_idx" ON "resource_links" USING btree ("resource_id","position");
