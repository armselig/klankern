-- Create consent_type enum
CREATE TYPE "public"."consent_type" AS ENUM('marketing', 'analytics', 'data_processing', 'third_party_sharing');--> statement-breakpoint

-- Validate existing data before migration
-- This will fail if there are invalid consent_type values
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "user_consents"
        WHERE "consent_type" NOT IN ('marketing', 'analytics', 'data_processing', 'third_party_sharing')
    ) THEN
        RAISE EXCEPTION 'Invalid consent_type values found. All values must be one of: marketing, analytics, data_processing, third_party_sharing';
    END IF;
END $$;--> statement-breakpoint

-- Alter user_consents table to use the enum
-- First, create a temporary column with the enum type
ALTER TABLE "user_consents" ADD COLUMN "consent_type_new" "consent_type";--> statement-breakpoint

-- Copy data from text column to enum column (casting)
-- Only process non-NULL values
UPDATE "user_consents" 
SET "consent_type_new" = "consent_type"::"consent_type"
WHERE "consent_type" IS NOT NULL;--> statement-breakpoint

-- Drop the old text column
ALTER TABLE "user_consents" DROP COLUMN "consent_type";--> statement-breakpoint

-- Rename the new column to the original name
ALTER TABLE "user_consents" RENAME COLUMN "consent_type_new" TO "consent_type";--> statement-breakpoint

-- Add NOT NULL constraint
ALTER TABLE "user_consents" ALTER COLUMN "consent_type" SET NOT NULL;
