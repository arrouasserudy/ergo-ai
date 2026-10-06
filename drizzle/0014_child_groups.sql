CREATE TABLE `child_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`place` text,
	`color` text DEFAULT 'teal' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `child_groups_account_idx` ON `child_groups` (`account_id`);--> statement-breakpoint
ALTER TABLE `children` ADD `group_id` text REFERENCES child_groups(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `children_group_idx` ON `children` (`group_id`);