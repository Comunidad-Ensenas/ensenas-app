CREATE TABLE `cultural_tips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `module_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`module_id` integer NOT NULL,
	`item_type` text NOT NULL,
	`item_id` integer NOT NULL,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `sign_modules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `module_prerequisites` (
	`module_id` integer NOT NULL,
	`required_module_id` integer NOT NULL,
	PRIMARY KEY(`module_id`, `required_module_id`),
	FOREIGN KEY (`module_id`) REFERENCES `sign_modules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`required_module_id`) REFERENCES `sign_modules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `phrase_signs` (
	`phrase_id` integer NOT NULL,
	`sign_id` integer NOT NULL,
	`order_index` integer NOT NULL,
	`transition_delay_ms` integer DEFAULT 0,
	PRIMARY KEY(`phrase_id`, `sign_id`, `order_index`),
	FOREIGN KEY (`phrase_id`) REFERENCES `phrases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sign_id`) REFERENCES `signs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `phrases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spanish_translation` text NOT NULL,
	`lsv_gloss` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `sign_execution_hints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sign_id` integer NOT NULL,
	`hint_text` text NOT NULL,
	`display_order` integer NOT NULL,
	`duration_ms` integer,
	FOREIGN KEY (`sign_id`) REFERENCES `signs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `signs_modules`;--> statement-breakpoint
ALTER TABLE `profile` ADD `learning_motivation` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `experience_level` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `avatar_skin_tone` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `haptic_feedback` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `profile` ADD `reminder_time` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `birthdate` text;