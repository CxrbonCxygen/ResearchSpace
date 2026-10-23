CREATE TABLE `research_report_keys` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_workspaces` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL
);
