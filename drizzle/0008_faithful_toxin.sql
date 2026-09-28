CREATE TABLE `child_files` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`child_id` text NOT NULL,
	`uploaded_by` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`form_date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `child_files_child_idx` ON `child_files` (`child_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`child_id` text NOT NULL,
	`created_by` text,
	`kind` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`scheduled_at` integer NOT NULL,
	`location` text,
	`notes` text,
	`remind_parent` integer DEFAULT true NOT NULL,
	`reminder_sent_at` integer,
	`reminder_channel` text,
	`reminder_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `meetings_account_scheduled_idx` ON `meetings` (`account_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `meetings_child_scheduled_idx` ON `meetings` (`child_id`,`scheduled_at`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `deadlines` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `children` ADD `parent_name` text;--> statement-breakpoint
ALTER TABLE `children` ADD `parent_phone` text;--> statement-breakpoint
ALTER TABLE `children` ADD `sms_reminders` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `children` ADD `sms_language` text DEFAULT 'he' NOT NULL;