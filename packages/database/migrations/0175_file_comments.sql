CREATE TABLE IF NOT EXISTS "file_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text,
	"anchor" jsonb NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_comments" DROP CONSTRAINT IF EXISTS "file_comments_file_id_files_id_fk";--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" DROP CONSTRAINT IF EXISTS "file_comments_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" DROP CONSTRAINT IF EXISTS "file_comments_workspace_id_workspaces_id_fk";--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_comments_file_id_created_at_idx" ON "file_comments" USING btree ("file_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_comments_user_id_idx" ON "file_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_comments_workspace_id_idx" ON "file_comments" USING btree ("workspace_id");
