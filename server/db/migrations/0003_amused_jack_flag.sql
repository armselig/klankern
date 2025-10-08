ALTER TABLE "corkboard_posts" ADD COLUMN "family_id" uuid;--> statement-breakpoint
ALTER TABLE "corkboard_posts" ADD CONSTRAINT "corkboard_posts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "corkboard_posts_family_id_idx" ON "corkboard_posts" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "families_creator_id_idx" ON "families" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "families_deleted_at_idx" ON "families" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "family_invitations_family_id_idx" ON "family_invitations" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "family_invitations_invited_email_idx" ON "family_invitations" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "family_members_user_id_idx" ON "family_members" USING btree ("user_id");