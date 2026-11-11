CREATE TABLE "solutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"question_id" uuid,
	"subject" text NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"body" jsonb NOT NULL,
	"slug" text,
	"views" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solutions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solutions_org_idx" ON "solutions" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "solutions_question_idx" ON "solutions" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "solutions_public_idx" ON "solutions" USING btree ("published_at");