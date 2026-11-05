ALTER TABLE "scores" ADD COLUMN "term" text DEFAULT 'HK1' NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" DROP CONSTRAINT "scores_student_id_column_pk";--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_student_id_term_column_pk" PRIMARY KEY("student_id","term","column");
