CREATE TABLE `accounts` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_user_id` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_categories_name` ON `categories` (`name`);--> statement-breakpoint
CREATE INDEX `idx_categories_user_id` ON `categories` (`user_id`);--> statement-breakpoint
CREATE TABLE `custom_widget_types` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'default',
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'custom' NOT NULL,
	`icon` text DEFAULT 'Puzzle' NOT NULL,
	`html_template` text NOT NULL,
	`config_schema` text,
	`default_config` text,
	`default_width` integer DEFAULT 2 NOT NULL,
	`default_height` integer DEFAULT 2 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_custom_widget_types_user_id` ON `custom_widget_types` (`user_id`);--> statement-breakpoint
CREATE TABLE `link_tags` (
	`link_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`link_id`, `tag_id`),
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`image_url` text,
	`favicon_url` text,
	`category_id` text,
	`is_favorite` integer DEFAULT false,
	`site_name` text,
	`author` text,
	`published_at` integer,
	`source` text,
	`source_id` text,
	`platform` text,
	`content_type` text,
	`platform_color` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`last_checked_at` integer,
	`health_status` text,
	`is_read` integer DEFAULT false,
	`notes` text,
	`reminder_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_links_user_id` ON `links` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_links_url` ON `links` (`url`);--> statement-breakpoint
CREATE INDEX `idx_links_category_id` ON `links` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_links_is_favorite` ON `links` (`is_favorite`);--> statement-breakpoint
CREATE INDEX `idx_links_created_at` ON `links` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_links_platform` ON `links` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_links_order` ON `links` (`order`);--> statement-breakpoint
CREATE INDEX `idx_links_deleted_at` ON `links` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_links_health_status` ON `links` (`health_status`);--> statement-breakpoint
CREATE INDEX `idx_links_category_created_at` ON `links` (`category_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_links_user_created_at` ON `links` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'default',
	`name` text NOT NULL,
	`description` text,
	`icon` text DEFAULT 'Folder',
	`color` text DEFAULT '#6366f1',
	`order` integer DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`color` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tags_user_id` ON `tags` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tags_user_name` ON `tags` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `user_backups` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'default' NOT NULL,
	`filename` text NOT NULL,
	`size` integer NOT NULL,
	`backup_data` text NOT NULL,
	`backup_type` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_user_backups_user_id` ON `user_backups` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_backups_created_at` ON `user_backups` (`created_at`);--> statement-breakpoint
CREATE TABLE `user_layouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'default',
	`layout_data` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'default' NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`view_density` text DEFAULT 'normal' NOT NULL,
	`view_mode` text DEFAULT 'bento' NOT NULL,
	`show_tooltips` integer DEFAULT true NOT NULL,
	`reduce_motion` integer DEFAULT false NOT NULL,
	`mcp_enabled` integer DEFAULT false NOT NULL,
	`mcp_api_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_settings_user_id` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer,
	`image` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `widgets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'default',
	`project_id` text,
	`type` text NOT NULL,
	`title` text,
	`size` text DEFAULT 'medium' NOT NULL,
	`category_id` text,
	`tag_id` text,
	`tags` text,
	`config` text,
	`layout_x` integer DEFAULT 0 NOT NULL,
	`layout_y` integer DEFAULT 0 NOT NULL,
	`layout_w` integer DEFAULT 2 NOT NULL,
	`layout_h` integer DEFAULT 2 NOT NULL,
	`is_visible` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_widgets_user_id` ON `widgets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_widgets_project_id` ON `widgets` (`project_id`);