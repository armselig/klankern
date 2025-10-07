CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "family_invitations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"family_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"invited_email" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "family_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"family_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "family_members_family_id_user_id_pk" PRIMARY KEY("family_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;