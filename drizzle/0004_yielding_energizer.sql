ALTER TABLE "user_settings" ADD COLUMN "language" varchar(5) DEFAULT 'es' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "grid_columns" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "sidebar_always_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "default_sort_field" varchar(20) DEFAULT 'createdAt' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "default_sort_order" varchar(4) DEFAULT 'desc' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "thumbnail_size" varchar(10) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "sidebar_density" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "auto_backup_interval" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "confirm_before_delete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "link_click_behavior" varchar(20) DEFAULT 'new-tab' NOT NULL;