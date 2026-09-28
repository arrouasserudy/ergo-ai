CREATE TABLE `child_forms` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`child_id` text NOT NULL,
	`template_id` text,
	`schema` text NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` integer,
	`submitted_by` text,
	`share_token_hash` text,
	`share_expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `form_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `child_forms_share_token_hash_unique` ON `child_forms` (`share_token_hash`);--> statement-breakpoint
CREATE INDEX `child_forms_child_idx` ON `child_forms` (`account_id`,`child_id`);--> statement-breakpoint
CREATE TABLE `form_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`created_by` text,
	`title` text NOT NULL,
	`source_filename` text NOT NULL,
	`source_kind` text NOT NULL,
	`schema` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`generated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `form_templates_account_idx` ON `form_templates` (`account_id`,`updated_at`);--> statement-breakpoint
ALTER TABLE `reports` ADD `form_ids` text DEFAULT '[]' NOT NULL;