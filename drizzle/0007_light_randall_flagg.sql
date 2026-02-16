CREATE TABLE "resource_card_tags" (
	"resource_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_tags_name_length_check" CHECK (char_length("resource_tags"."name") <= 40)
);
--> statement-breakpoint
ALTER TABLE "resource_categories" ADD COLUMN "symbol" text;--> statement-breakpoint
ALTER TABLE "resource_card_tags" ADD CONSTRAINT "resource_card_tags_resource_id_resource_cards_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_card_tags" ADD CONSTRAINT "resource_card_tags_tag_id_resource_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."resource_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_card_tags_resource_id_idx" ON "resource_card_tags" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "resource_card_tags_tag_id_idx" ON "resource_card_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_card_tags_resource_tag_unique_idx" ON "resource_card_tags" USING btree ("resource_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_tags_name_lower_idx" ON "resource_tags" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "resource_tags_created_at_idx" ON "resource_tags" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "resource_categories" ADD CONSTRAINT "resource_categories_symbol_length_check" CHECK ("resource_categories"."symbol" IS NULL OR char_length("resource_categories"."symbol") <= 16);