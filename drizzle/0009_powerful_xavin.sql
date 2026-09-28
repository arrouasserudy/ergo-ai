ALTER TABLE `accounts` ADD `deadline_warn_days` integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `school_year_start` text DEFAULT '09-01' NOT NULL;--> statement-breakpoint
ALTER TABLE `child_forms` ADD `due_date` text;--> statement-breakpoint
ALTER TABLE `child_forms` ADD `cycle` text;--> statement-breakpoint
CREATE INDEX `child_forms_due_idx` ON `child_forms` (`account_id`,`status`,`due_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `child_forms_auto_cycle_idx` ON `child_forms` (`child_id`,`template_id`,`cycle`);--> statement-breakpoint
ALTER TABLE `form_templates` ADD `auto_assign` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `form_templates` ADD `deadline` text;