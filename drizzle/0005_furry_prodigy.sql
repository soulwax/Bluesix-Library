CREATE TABLE "color_scheme_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"visitor_id" uuid,
	"color_scheme" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "color_scheme_preferences_color_scheme_length_check" CHECK (char_length("color_scheme_preferences"."color_scheme") <= 64),
	CONSTRAINT "color_scheme_preferences_target_check" CHECK ("color_scheme_preferences"."user_id" IS NOT NULL OR "color_scheme_preferences"."visitor_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "color_scheme_preferences" ADD CONSTRAINT "color_scheme_preferences_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "color_scheme_preferences_user_id_idx" ON "color_scheme_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "color_scheme_preferences_visitor_id_idx" ON "color_scheme_preferences" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "color_scheme_preferences_updated_at_idx" ON "color_scheme_preferences" USING btree ("updated_at");