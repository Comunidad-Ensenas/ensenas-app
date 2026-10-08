CREATE TABLE `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`activity_date` text DEFAULT CURRENT_DATE,
	`xp_earned` integer DEFAULT 0,
	FOREIGN KEY (`profile_id`) REFERENCES `profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_log_profile_id_activity_date_unique` ON `activity_log` (`profile_id`,`activity_date`);--> statement-breakpoint
CREATE TABLE `cultural_tips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `manual_configurations` (
	`local_id` text PRIMARY KEY NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`image_path` text,
	`raw_landmarks` text NOT NULL,
	`baked_quaternions` text NOT NULL,
	`learning_tips` text
);
--> statement-breakpoint
CREATE TABLE `module_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`module_id` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text,
	`config_id` text,
	`sign_id` text,
	`phrase_id` text,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `sign_modules`(`local_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`config_id`) REFERENCES `manual_configurations`(`local_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sign_id`) REFERENCES `signs`(`local_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phrase_id`) REFERENCES `phrases`(`local_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `module_prerequisites` (
	`module_id` text NOT NULL,
	`required_module_id` text NOT NULL,
	PRIMARY KEY(`module_id`, `required_module_id`),
	FOREIGN KEY (`module_id`) REFERENCES `sign_modules`(`local_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`required_module_id`) REFERENCES `sign_modules`(`local_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `module_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`module_id` text NOT NULL,
	`completion_percentage` real DEFAULT 0,
	`is_unlocked` integer DEFAULT false,
	`is_completed` integer DEFAULT false,
	`accuracy_score` real DEFAULT 0,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`profile_id`) REFERENCES `profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`module_id`) REFERENCES `sign_modules`(`local_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `module_progress_profile_id_module_id_unique` ON `module_progress` (`profile_id`,`module_id`);--> statement-breakpoint
CREATE TABLE `phrase_signs` (
	`phrase_id` text NOT NULL,
	`sign_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`transition_delay_ms` integer DEFAULT 0,
	PRIMARY KEY(`phrase_id`, `sign_id`, `order_index`),
	FOREIGN KEY (`phrase_id`) REFERENCES `phrases`(`local_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sign_id`) REFERENCES `signs`(`local_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `phrases` (
	`local_id` text PRIMARY KEY NOT NULL,
	`spanish_translation` text NOT NULL,
	`lsv_gloss` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`current_streak` integer DEFAULT 0,
	`last_activity_date` text DEFAULT CURRENT_TIMESTAMP,
	`is_left_handed` integer DEFAULT false,
	`daily_goal_minutes` integer DEFAULT 5,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`learning_motivation` text,
	`experience_level` text,
	`avatar_skin_tone` text,
	`haptic_feedback` integer DEFAULT true,
	`reminder_time` text,
	`birthdate` text
);
--> statement-breakpoint
CREATE TABLE `sign_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon_name` text DEFAULT 'BookStack' NOT NULL,
	`color_hex` text DEFAULT '#10B981' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sign_execution_hints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sign_id` text NOT NULL,
	`hint_text` text NOT NULL,
	`display_order` integer NOT NULL,
	`duration_ms` integer,
	FOREIGN KEY (`sign_id`) REFERENCES `signs`(`local_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sign_modules` (
	`local_id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`difficulty_level` integer DEFAULT 1,
	`order_index` integer
);
--> statement-breakpoint
CREATE TABLE `signs` (
	`local_id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`meanings_json` text,
	`description` text,
	`category_id` integer,
	`config_hand_dominant_id` text,
	`config_hand_recessive_id` text,
	`baked_animation` text NOT NULL,
	`movement_type` text,
	`match_threshold` real DEFAULT 0.85,
	`non_manual_hint` text,
	`icon_path` text,
	`learning_tips` text,
	FOREIGN KEY (`category_id`) REFERENCES `sign_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`config_hand_dominant_id`) REFERENCES `manual_configurations`(`local_id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`config_hand_recessive_id`) REFERENCES `manual_configurations`(`local_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `user_sign_mastery` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`sign_id` text NOT NULL,
	`mastery_level` integer DEFAULT 0,
	`correct_attempts` integer DEFAULT 0,
	`wrong_attempts` integer DEFAULT 0,
	`last_practiced_at` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sign_id`) REFERENCES `signs`(`local_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_sign_mastery_profile_id_sign_id_unique` ON `user_sign_mastery` (`profile_id`,`sign_id`);