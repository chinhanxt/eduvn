CREATE TABLE "tutor_book_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_type" text DEFAULT 'theory' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"kb_id" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"level" text DEFAULT 'mixed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" uuid NOT NULL,
	"kb_id" uuid NOT NULL,
	"page" integer NOT NULL,
	"idx" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kb_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"source" text NOT NULL,
	"pages" integer NOT NULL,
	"chars" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_question_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"status" text NOT NULL,
	"kb_id" uuid,
	"subject" text NOT NULL,
	"grade" integer NOT NULL,
	"topic" text NOT NULL,
	"body" jsonb NOT NULL,
	"bank_question_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_kbs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"grade" integer NOT NULL,
	"class_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"learner_key" text NOT NULL,
	"kb_id" uuid,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"subject" text NOT NULL,
	"grade" integer NOT NULL,
	"body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"learner_key" text NOT NULL,
	"question_id" uuid NOT NULL,
	"rating" text NOT NULL,
	"correct" boolean NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_review_state" (
	"org_id" uuid NOT NULL,
	"learner_key" text NOT NULL,
	"question_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"grade" integer NOT NULL,
	"topic" text NOT NULL,
	"interval_days" real NOT NULL,
	"ease" real NOT NULL,
	"streak" integer NOT NULL,
	"lapses" integer NOT NULL,
	"review_count" integer NOT NULL,
	"version" integer NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_review_at" timestamp with time zone NOT NULL,
	"prev" jsonb,
	"last_correct" boolean DEFAULT true NOT NULL,
	"is_mistake" boolean DEFAULT false NOT NULL,
	"first_wrong_at" timestamp with time zone,
	CONSTRAINT "tutor_review_state_org_id_learner_key_question_id_pk" PRIMARY KEY("org_id","learner_key","question_id")
);
--> statement-breakpoint
CREATE TABLE "tutor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"learner_key" text NOT NULL,
	"kb_id" uuid,
	"mode" text DEFAULT 'chat' NOT NULL,
	"title" text DEFAULT 'Cuộc trò chuyện mới' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"summarized_count" integer DEFAULT 0 NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tutor_book_pages" ADD CONSTRAINT "tutor_book_pages_book_id_tutor_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."tutor_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_books" ADD CONSTRAINT "tutor_books_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_books" ADD CONSTRAINT "tutor_books_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_books" ADD CONSTRAINT "tutor_books_kb_id_tutor_kbs_id_fk" FOREIGN KEY ("kb_id") REFERENCES "public"."tutor_kbs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_chunks" ADD CONSTRAINT "tutor_chunks_doc_id_tutor_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."tutor_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_chunks" ADD CONSTRAINT "tutor_chunks_kb_id_tutor_kbs_id_fk" FOREIGN KEY ("kb_id") REFERENCES "public"."tutor_kbs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_docs" ADD CONSTRAINT "tutor_docs_kb_id_tutor_kbs_id_fk" FOREIGN KEY ("kb_id") REFERENCES "public"."tutor_kbs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_docs" ADD CONSTRAINT "tutor_docs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_question_drafts" ADD CONSTRAINT "tutor_question_drafts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_question_drafts" ADD CONSTRAINT "tutor_question_drafts_kb_id_tutor_kbs_id_fk" FOREIGN KEY ("kb_id") REFERENCES "public"."tutor_kbs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_kbs" ADD CONSTRAINT "tutor_kbs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_kbs" ADD CONSTRAINT "tutor_kbs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_kbs" ADD CONSTRAINT "tutor_kbs_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_messages" ADD CONSTRAINT "tutor_messages_session_id_tutor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tutor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_paths" ADD CONSTRAINT "tutor_paths_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_paths" ADD CONSTRAINT "tutor_paths_kb_id_tutor_kbs_id_fk" FOREIGN KEY ("kb_id") REFERENCES "public"."tutor_kbs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_review_events" ADD CONSTRAINT "tutor_review_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_review_state" ADD CONSTRAINT "tutor_review_state_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_sessions" ADD CONSTRAINT "tutor_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_sessions" ADD CONSTRAINT "tutor_sessions_kb_id_tutor_kbs_id_fk" FOREIGN KEY ("kb_id") REFERENCES "public"."tutor_kbs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tutor_book_pages_idx" ON "tutor_book_pages" USING btree ("book_id","idx");--> statement-breakpoint
CREATE INDEX "tutor_books_org_idx" ON "tutor_books" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tutor_chunks_kb_idx" ON "tutor_chunks" USING btree ("kb_id");--> statement-breakpoint
CREATE INDEX "tutor_docs_kb_idx" ON "tutor_docs" USING btree ("kb_id");--> statement-breakpoint
CREATE INDEX "tutor_drafts_org_idx" ON "tutor_question_drafts" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "tutor_kbs_org_idx" ON "tutor_kbs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tutor_messages_session_idx" ON "tutor_messages" USING btree ("session_id","seq");--> statement-breakpoint
CREATE INDEX "tutor_paths_learner_idx" ON "tutor_paths" USING btree ("org_id","learner_key");--> statement-breakpoint
CREATE INDEX "tutor_review_events_idx" ON "tutor_review_events" USING btree ("org_id","learner_key","reviewed_at");--> statement-breakpoint
CREATE INDEX "tutor_review_due_idx" ON "tutor_review_state" USING btree ("org_id","learner_key","due_at");--> statement-breakpoint
CREATE INDEX "tutor_sessions_learner_idx" ON "tutor_sessions" USING btree ("org_id","learner_key");