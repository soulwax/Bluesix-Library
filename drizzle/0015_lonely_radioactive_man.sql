ALTER TABLE "app_users" ADD COLUMN "username" text;--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_username_lower_idx" ON "app_users" USING btree (lower("username")) WHERE "app_users"."username" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_username_length_check" CHECK ("app_users"."username" IS NULL OR char_length("app_users"."username") <= 39);