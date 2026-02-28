CREATE INDEX "app_users_created_at_idx" ON "app_users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "resource_cards_workspace_category_deleted_idx" ON "resource_cards" USING btree ("workspace_id","category_id","deleted_at");--> statement-breakpoint
CREATE INDEX "resource_cards_deleted_at_idx" ON "resource_cards" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "resource_links_url_idx" ON "resource_links" USING btree (lower("url"));