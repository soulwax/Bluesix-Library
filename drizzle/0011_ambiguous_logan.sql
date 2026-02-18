CREATE TABLE "ai_paste_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"decision" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_paste_preferences_decision_check" CHECK ("ai_paste_preferences"."decision" IN ('accepted', 'declined'))
);
--> statement-breakpoint
ALTER TABLE "ai_paste_preferences" ADD CONSTRAINT "ai_paste_preferences_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_paste_preferences_updated_at_idx" ON "ai_paste_preferences" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "resource_cards_workspace_id_active_idx" ON "resource_cards" USING btree ("workspace_id") WHERE "resource_cards"."deleted_at" IS NULL;