ALTER TABLE "inspection_requests" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inspection_requests" ADD COLUMN "notification_error" text;