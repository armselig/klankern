CREATE INDEX CONCURRENTLY "corkboard_posts_family_timeline_idx" ON "corkboard_posts" USING btree ("family_id","created_at");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "corkboard_posts_data_gin_idx" ON "corkboard_posts" USING gin ("data");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "families_active_idx" ON "families" USING btree ("created_at") WHERE "families"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX CONCURRENTLY "family_invitations_family_status_idx" ON "family_invitations" USING btree ("family_id","status");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "family_invitations_pending_idx" ON "family_invitations" USING btree ("family_id","invited_email") WHERE "family_invitations"."status" = 'pending';--> statement-breakpoint
CREATE INDEX CONCURRENTLY "sessions_user_active_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "sessions_active_idx" ON "sessions" USING btree ("expires_at") WHERE "sessions"."expires_at" > now();--> statement-breakpoint
CREATE INDEX CONCURRENTLY "users_dashboard_config_gin_idx" ON "users" USING gin ("dashboard_config");