CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`therapist_id` text,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`props` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `usage_events_created_idx` ON `usage_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `usage_events_name_created_idx` ON `usage_events` (`kind`,`name`,`created_at`);