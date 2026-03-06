CREATE TABLE "link_categories" (
	"link_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "link_categories_link_id_category_id_pk" PRIMARY KEY("link_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) DEFAULT 'default',
	"name" varchar(100) NOT NULL,
	"query" text NOT NULL,
	"filters" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) DEFAULT 'default',
	"type" varchar(20) NOT NULL,
	"reference_id" uuid NOT NULL,
	"share_token" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "shared_collections_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "is_read" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "reminder_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "language" varchar(10) DEFAULT 'es' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "grid_columns" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "sidebar_always_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "default_sort_field" varchar(20) DEFAULT 'createdAt' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "default_sort_order" varchar(10) DEFAULT 'desc' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "thumbnail_size" varchar(20) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "sidebar_density" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "auto_backup_interval" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "confirm_before_delete" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "link_click_behavior" varchar(20) DEFAULT 'new-tab' NOT NULL;--> statement-breakpoint
ALTER TABLE "link_categories" ADD CONSTRAINT "link_categories_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_categories" ADD CONSTRAINT "link_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_saved_searches_user_id" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shared_collections_token" ON "shared_collections" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "idx_shared_collections_user_id" ON "shared_collections" USING btree ("user_id");