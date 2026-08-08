CREATE TYPE "public"."inspection_finish" AS ENUM('brass-glass', 'smoked-glass', 'unsure');--> statement-breakpoint
CREATE TYPE "public"."inspection_setting" AS ENUM('villa', 'residence', 'commercial', 'unsure');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('new', 'contacted', 'scheduled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."request_locale" AS ENUM('en', 'ar');--> statement-breakpoint
CREATE TABLE "inspection_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"area" text NOT NULL,
	"setting" "inspection_setting" DEFAULT 'unsure' NOT NULL,
	"finish" "inspection_finish" DEFAULT 'unsure' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"locale" "request_locale" NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"status" "inspection_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_requests_reference_idx" ON "inspection_requests" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "inspection_requests_status_created_idx" ON "inspection_requests" USING btree ("status","created_at");