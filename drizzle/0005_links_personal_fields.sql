ALTER TABLE "links" ADD COLUMN "is_read" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "reminder_at" timestamp with time zone;
