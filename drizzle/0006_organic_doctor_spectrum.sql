CREATE TABLE `report_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`account_id` text NOT NULL,
	`recipient` text NOT NULL,
	`generated` text NOT NULL,
	`sections` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`generated_at` integer NOT NULL,
	`validated_at` integer,
	`exported_at` integer,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_variants_report_recipient_idx` ON `report_variants` (`report_id`,`recipient`);--> statement-breakpoint
CREATE INDEX `report_variants_account_generated_idx` ON `report_variants` (`account_id`,`generated_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`child_id` text NOT NULL,
	`author_id` text,
	`doc_type` text NOT NULL,
	`session_date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`tests` text DEFAULT '[]' NOT NULL,
	`recipients` text DEFAULT '["parents"]' NOT NULL,
	`language` text DEFAULT 'fr' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reports_account_updated_idx` ON `reports` (`account_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `reports_child_idx` ON `reports` (`child_id`);--> statement-breakpoint
CREATE TABLE `style_examples` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`therapist_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`recipient` text NOT NULL,
	`doc_type` text NOT NULL,
	`before` text NOT NULL,
	`after` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `report_variants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `style_examples_variant_id_unique` ON `style_examples` (`variant_id`);--> statement-breakpoint
CREATE INDEX `style_examples_therapist_recipient_idx` ON `style_examples` (`therapist_id`,`recipient`,`created_at`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `letterhead` text;