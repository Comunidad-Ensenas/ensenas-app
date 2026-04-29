CREATE TABLE `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`activity_date` text DEFAULT CURRENT_DATE,
	`xp_earned` integer DEFAULT 0,
	FOREIGN KEY (`profile_id`) REFERENCES `profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_log_profile_id_activity_date_unique` ON `activity_log` (`profile_id`,`activity_date`);--> statement-breakpoint
CREATE TABLE `manual_configurations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`image_path` text
);
--> statement-breakpoint
CREATE TABLE `module_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`module_id` integer NOT NULL,
	`completion_percentage` real DEFAULT 0,
	`is_unlocked` integer DEFAULT false,
	`is_completed` integer DEFAULT false,
	`accuracy_score` real DEFAULT 0,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`profile_id`) REFERENCES `profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`module_id`) REFERENCES `sign_modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `module_progress_profile_id_module_id_unique` ON `module_progress` (`profile_id`,`module_id`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`current_streak` integer DEFAULT 0,
	`last_activity_date` text DEFAULT CURRENT_TIMESTAMP,
	`is_left_handed` integer DEFAULT false,
	`daily_goal_minutes` integer DEFAULT 5,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sign_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `sign_modules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`difficulty_level` integer DEFAULT 1,
	`order_index` integer
);
--> statement-breakpoint
CREATE TABLE `signs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category_id` integer,
	`config_hand_dominant_id` integer,
	`config_hand_recessive_id` integer,
	`vector_data` text NOT NULL,
	`movement_type` text,
	`match_threshold` real DEFAULT 0.85,
	`non_manual_hint` text,
	`icon_path` text,
	FOREIGN KEY (`category_id`) REFERENCES `sign_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`config_hand_dominant_id`) REFERENCES `manual_configurations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`config_hand_recessive_id`) REFERENCES `manual_configurations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `signs_modules` (
	`sign_id` integer NOT NULL,
	`module_id` integer NOT NULL,
	PRIMARY KEY(`sign_id`, `module_id`),
	FOREIGN KEY (`sign_id`) REFERENCES `signs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`module_id`) REFERENCES `sign_modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_sign_mastery` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`sign_id` integer NOT NULL,
	`mastery_level` integer DEFAULT 0,
	`correct_attempts` integer DEFAULT 0,
	`wrong_attempts` integer DEFAULT 0,
	`last_practiced_at` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sign_id`) REFERENCES `signs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_sign_mastery_profile_id_sign_id_unique` ON `user_sign_mastery` (`profile_id`,`sign_id`);