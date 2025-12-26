ALTER TABLE "categories" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "last_checked_at" timestamp;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "health_status" varchar(20);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "deleted_at" timestamp;