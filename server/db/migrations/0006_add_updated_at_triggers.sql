-- Create reusable trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
--> statement-breakpoint

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

-- Apply trigger to families table
CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

-- Apply trigger to family_invitations table
CREATE TRIGGER update_family_invitations_updated_at
    BEFORE UPDATE ON family_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

-- Apply trigger to corkboard_posts table
CREATE TRIGGER update_corkboard_posts_updated_at
    BEFORE UPDATE ON corkboard_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

-- Apply trigger to family_members table (junction table)
CREATE TRIGGER update_family_members_updated_at
    BEFORE UPDATE ON family_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

-- Apply trigger to user_roles table (junction table)
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
