CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(20),
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_tags" (
	"link_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "link_tags_link_id_tag_id_pk" PRIMARY KEY("link_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"favicon_url" text,
	"category_id" uuid,
	"is_favorite" boolean DEFAULT false,
	"site_name" varchar(100),
	"author" varchar(100),
	"published_at" timestamp,
	"source" varchar(50),
	"source_id" varchar(100),
	"platform" varchar(50),
	"content_type" varchar(30),
	"platform_color" varchar(20),
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) DEFAULT 'default',
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50) DEFAULT 'Folder',
	"color" varchar(20) DEFAULT '#6366f1',
	"order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"color" varchar(20),
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) DEFAULT 'default',
	"layout_data" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) DEFAULT 'default' NOT NULL,
	"theme" varchar(20) DEFAULT 'system' NOT NULL,
	"view_density" varchar(20) DEFAULT 'normal' NOT NULL,
	"view_mode" varchar(20) DEFAULT 'bento' NOT NULL,
	"show_tooltips" boolean DEFAULT true NOT NULL,
	"reduce_motion" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) DEFAULT 'default',
	"project_id" uuid,
	"type" varchar(50) NOT NULL,
	"title" varchar(100),
	"size" varchar(20) DEFAULT 'medium' NOT NULL,
	"category_id" uuid,
	"tag_id" uuid,
	"tags" json,
	"config" json,
	"layout_x" integer DEFAULT 0 NOT NULL,
	"layout_y" integer DEFAULT 0 NOT NULL,
	"layout_w" integer DEFAULT 2 NOT NULL,
	"layout_h" integer DEFAULT 2 NOT NULL,
	"is_visible" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "link_tags" ADD CONSTRAINT "link_tags_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_tags" ADD CONSTRAINT "link_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_categories_name" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_links_url" ON "links" USING btree ("url");--> statement-breakpoint
CREATE INDEX "idx_links_category_id" ON "links" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_links_is_favorite" ON "links" USING btree ("is_favorite");--> statement-breakpoint
CREATE INDEX "idx_links_created_at" ON "links" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_links_platform" ON "links" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_links_order" ON "links" USING btree ("order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_settings_user_id" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_widgets_user_id" ON "widgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_widgets_project_id" ON "widgets" USING btree ("project_id");