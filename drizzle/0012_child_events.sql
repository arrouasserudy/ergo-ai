CREATE TABLE `child_events` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`child_id` text NOT NULL,
	`created_by` text,
	`kind` text NOT NULL,
	`date` text NOT NULL,
	`time` text,
	`report_id` text,
	`details` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `child_events_account_date_idx` ON `child_events` (`account_id`,`date`);--> statement-breakpoint
CREATE INDEX `child_events_child_idx` ON `child_events` (`child_id`,`date`);