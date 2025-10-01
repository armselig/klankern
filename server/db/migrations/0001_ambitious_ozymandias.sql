ALTER TABLE "corkboard_posts" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuidv7();