ALTER TABLE "corkboard_posts" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "family_invitations" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "corkboard_posts_deleted_at_idx" ON "corkboard_posts" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "family_invitations_deleted_at_idx" ON "family_invitations" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "family_members_deleted_at_idx" ON "family_members" USING btree ("deleted_at");--> statement-breakpoint

-- Trigger function to cascade soft deletes from families to related tables
CREATE OR REPLACE FUNCTION soft_delete_family_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- Soft delete related family members
    UPDATE family_members
    SET deleted_at = NEW.deleted_at
    WHERE family_id = NEW.id AND deleted_at IS NULL;

    -- Soft delete related invitations
    UPDATE family_invitations
    SET deleted_at = NEW.deleted_at
    WHERE family_id = NEW.id AND deleted_at IS NULL;

    -- Soft delete related corkboard posts
    UPDATE corkboard_posts
    SET deleted_at = NEW.deleted_at
    WHERE family_id = NEW.id AND deleted_at IS NULL;

    RETURN NEW;
END;
$$ language 'plpgsql';--> statement-breakpoint

-- Attach trigger to families table
CREATE TRIGGER cascade_family_soft_delete
    AFTER UPDATE OF deleted_at ON families
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
    EXECUTE FUNCTION soft_delete_family_cascade();