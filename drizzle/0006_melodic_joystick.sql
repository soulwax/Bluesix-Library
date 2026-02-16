CREATE TABLE "resource_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_categories_name_length_check" CHECK (char_length("resource_categories"."name") <= 80)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "resource_categories_name_lower_idx" ON "resource_categories" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "resource_categories_created_at_idx" ON "resource_categories" USING btree ("created_at");