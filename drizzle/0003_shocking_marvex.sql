CREATE TABLE "resource_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" uuid,
	"actor_identifier" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_audit_logs_action_check" CHECK ("resource_audit_logs"."action" IN ('archived', 'restored')),
	CONSTRAINT "resource_audit_logs_actor_identifier_length_check" CHECK (char_length("resource_audit_logs"."actor_identifier") <= 320)
);
--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ADD CONSTRAINT "resource_audit_logs_resource_id_resource_cards_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_audit_logs" ADD CONSTRAINT "resource_audit_logs_actor_user_id_app_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_audit_logs_created_at_idx" ON "resource_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "resource_audit_logs_resource_id_created_at_idx" ON "resource_audit_logs" USING btree ("resource_id","created_at");--> statement-breakpoint
CREATE INDEX "resource_audit_logs_actor_user_id_created_at_idx" ON "resource_audit_logs" USING btree ("actor_user_id","created_at");