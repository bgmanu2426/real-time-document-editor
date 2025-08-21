CREATE TABLE "document_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"head_version_id" integer,
	"created_by_id" integer NOT NULL,
	"parent_branch" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_protected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"permission" varchar(20) DEFAULT 'read' NOT NULL,
	"invited_by_id" integer,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"version_id" integer,
	"author_id" integer NOT NULL,
	"parent_comment_id" integer,
	"content" text NOT NULL,
	"position" json,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by_id" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_merges" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"source_branch" varchar(100) NOT NULL,
	"target_branch" varchar(100) NOT NULL,
	"source_version_id" integer NOT NULL,
	"target_version_id" integer NOT NULL,
	"merge_version_id" integer,
	"merged_by_id" integer NOT NULL,
	"conflicts" json,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "document_operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"operation_type" varchar(20) NOT NULL,
	"position" integer NOT NULL,
	"content" text,
	"length" integer,
	"attributes" json,
	"author_id" integer NOT NULL,
	"version_before" integer NOT NULL,
	"version_after" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"branch_name" varchar(100) DEFAULT 'main' NOT NULL,
	"author_id" integer NOT NULL,
	"commit_message" text,
	"parent_version_id" integer,
	"operations" json,
	"content_hash" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"steps" json,
	"current_step" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"assigned_to_id" integer,
	"due_date" timestamp,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"owner_id" integer NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "document_branches" ADD CONSTRAINT "document_branches_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_branches" ADD CONSTRAINT "document_branches_head_version_id_document_versions_id_fk" FOREIGN KEY ("head_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_branches" ADD CONSTRAINT "document_branches_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_version_id_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_merges" ADD CONSTRAINT "document_merges_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_merges" ADD CONSTRAINT "document_merges_source_version_id_document_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_merges" ADD CONSTRAINT "document_merges_target_version_id_document_versions_id_fk" FOREIGN KEY ("target_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_merges" ADD CONSTRAINT "document_merges_merge_version_id_document_versions_id_fk" FOREIGN KEY ("merge_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_merges" ADD CONSTRAINT "document_merges_merged_by_id_users_id_fk" FOREIGN KEY ("merged_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_operations" ADD CONSTRAINT "document_operations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_operations" ADD CONSTRAINT "document_operations_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_workflows" ADD CONSTRAINT "document_workflows_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_workflows" ADD CONSTRAINT "document_workflows_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_workflows" ADD CONSTRAINT "document_workflows_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_branch_idx" ON "document_branches" USING btree ("document_id","name");--> statement-breakpoint
CREATE INDEX "created_by_idx" ON "document_branches" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "document_user_idx" ON "document_collaborators" USING btree ("document_id","user_id");--> statement-breakpoint
CREATE INDEX "permission_idx" ON "document_collaborators" USING btree ("permission");--> statement-breakpoint
CREATE INDEX "document_comment_idx" ON "document_comments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "comment_author_idx" ON "document_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "comment_version_idx" ON "document_comments" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "document_merge_idx" ON "document_merges" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "merge_status_idx" ON "document_merges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_op_idx" ON "document_operations" USING btree ("document_id","timestamp");--> statement-breakpoint
CREATE INDEX "author_op_idx" ON "document_operations" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "document_version_idx" ON "document_versions" USING btree ("document_id","version");--> statement-breakpoint
CREATE INDEX "branch_idx" ON "document_versions" USING btree ("document_id","branch_name");--> statement-breakpoint
CREATE INDEX "author_idx" ON "document_versions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "document_workflow_idx" ON "document_workflows" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "workflow_status_idx" ON "document_workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_assigned_idx" ON "document_workflows" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "owner_idx" ON "documents" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "title_idx" ON "documents" USING btree ("title");