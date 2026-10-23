CREATE TABLE `research_training_keys` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`run_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_training_points` (
	`user_id` text NOT NULL,
	`run_key` text NOT NULL,
	`step` integer NOT NULL,
	`metric` text NOT NULL,
	`value` real NOT NULL,
	PRIMARY KEY(`user_id`, `run_key`, `step`, `metric`)
);
--> statement-breakpoint
CREATE TABLE `research_training_runs` (
	`user_id` text NOT NULL,
	`run_key` text NOT NULL,
	`payload` text NOT NULL,
	`observed_at` text NOT NULL,
	`received_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `run_key`)
);
