CREATE TABLE "ai_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"grade" integer,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" jsonb NOT NULL,
	"request" jsonb NOT NULL,
	"outline" jsonb,
	"scenes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_lessons" ADD CONSTRAINT "ai_lessons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_lessons" ADD CONSTRAINT "ai_lessons_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_lessons_org_idx" ON "ai_lessons" USING btree ("org_id");