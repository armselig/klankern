CREATE TYPE "public"."family_role" AS ENUM('manager', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'cancelled');--> statement-breakpoint
ALTER TABLE "families" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "family_invitations" ALTER COLUMN "invited_email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "family_invitations" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."invitation_status";--> statement-breakpoint
ALTER TABLE "family_invitations" ALTER COLUMN "status" SET DATA TYPE "public"."invitation_status" USING "status"::"public"."invitation_status";--> statement-breakpoint
ALTER TABLE "family_members" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."family_role";--> statement-breakpoint
ALTER TABLE "family_members" ALTER COLUMN "role" SET DATA TYPE "public"."family_role" USING "role"::"public"."family_role";--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "name" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "description" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "display_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET DATA TYPE varchar(100);--> statement-breakpoint
CREATE UNIQUE INDEX "family_invitations_unique_pending" ON "family_invitations" USING btree ("family_id","invited_email") WHERE status = 'pending';