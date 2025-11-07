-- Create consent_type enum
CREATE TYPE "public"."consent_type" AS ENUM('marketing', 'analytics', 'data_processing', 'third_party_sharing');--> statement-breakpoint

-- Alter user_consents table to use the enum
-- First, create a temporary column with the enum type
ALTER TABLE "user_consents" ADD COLUMN "consent_type_new" "consent_type";--> statement-breakpoint

-- Copy data from text column to enum column (casting)
UPDATE "user_consents" SET "consent_type_new" = "consent_type"::"consent_type";--> statement-breakpoint

-- Drop the old text column
ALTER TABLE "user_consents" DROP COLUMN "consent_type";--> statement-breakpoint

-- Rename the new column to the original name
ALTER TABLE "user_consents" RENAME COLUMN "consent_type_new" TO "consent_type";--> statement-breakpoint

-- Add NOT NULL constraint
ALTER TABLE "user_consents" ALTER COLUMN "consent_type" SET NOT NULL;
