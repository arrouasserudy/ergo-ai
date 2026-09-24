CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`child_id` text NOT NULL,
	`recorded_by` text,
	`kind` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`situation` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`antecedent` text,
	`behavior` text,
	`causes` text DEFAULT '[]' NOT NULL,
	`helped` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `episodes_child_started_idx` ON `episodes` (`child_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `episodes_account_started_idx` ON `episodes` (`account_id`,`started_at`);