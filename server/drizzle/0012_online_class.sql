CREATE TABLE "answer_items" (
	"submission_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"no" integer NOT NULL,
	"question_id" text NOT NULL,
	"topic" text NOT NULL,
	"level" text NOT NULL,
	"type" text NOT NULL,
	"points" real,
	"max_points" real NOT NULL,
	"correct" boolean,
	"choice" text,
	CONSTRAINT "answer_items_submission_id_no_pk" PRIMARY KEY("submission_id","no")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"subject" text NOT NULL,
	"source" jsonb NOT NULL,
	"variants" jsonb NOT NULL,
	"rules" jsonb NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer,
	"attempts_allowed" integer NOT NULL,
	"show_solution" text NOT NULL,
	"shuffle" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"variant_code" text NOT NULL,
	"seed" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seq" integer DEFAULT 0 NOT NULL,
	"score" real,
	"max_score" real,
	"pending" integer DEFAULT 0 NOT NULL,
	"leave_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "join_code" text;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "join_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "seat" integer;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "badge_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "link_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "answer_items" ADD CONSTRAINT "answer_items_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_items" ADD CONSTRAINT "answer_items_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_events" ADD CONSTRAINT "submission_events_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answer_items_assignment_idx" ON "answer_items" USING btree ("assignment_id","question_id");--> statement-breakpoint
CREATE INDEX "assignments_class_idx" ON "assignments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "submission_events_sub_idx" ON "submission_events" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_attempt_uq" ON "submissions" USING btree ("assignment_id","student_id","attempt");--> statement-breakpoint
CREATE INDEX "submissions_open_idx" ON "submissions" USING btree ("status","deadline_at");--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "students_seat_uq" ON "students" USING btree ("class_id","seat");--> statement-breakpoint
CREATE UNIQUE INDEX "students_user_uq" ON "students" USING btree ("class_id","user_id");--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_join_code_unique" UNIQUE("join_code");