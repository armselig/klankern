CREATE INDEX "corkboard_posts_user_id_idx" ON "corkboard_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "corkboard_posts_type_idx" ON "corkboard_posts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "corkboard_posts_created_at_idx" ON "corkboard_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");