CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`child_id` text NOT NULL,
	`created_by` text,
	`definition_id` text NOT NULL,
	`definition_version` integer NOT NULL,
	`test_date` text NOT NULL,
	`answers` text DEFAULT '{"values":{},"ticks":{},"comments":{}}' NOT NULL,
	`scores` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`completed_at` integer,
	`completed_by` text,
	`share_token_hash` text,
	`share_expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessments_share_token_hash_unique` ON `assessments` (`share_token_hash`);--> statement-breakpoint
CREATE INDEX `assessments_child_idx` ON `assessments` (`account_id`,`child_id`);--> statement-breakpoint
ALTER TABLE `reports` ADD `assessment_ids` text DEFAULT '[]' NOT NULL;