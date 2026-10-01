ALTER TABLE `form_templates` ADD `builtin_key` text;--> statement-breakpoint
ALTER TABLE `form_templates` ADD `builtin_version` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `form_templates_builtin_idx` ON `form_templates` (`account_id`,`builtin_key`);