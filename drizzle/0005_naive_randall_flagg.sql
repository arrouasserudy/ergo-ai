ALTER TABLE `conversations` ADD `provider` text DEFAULT 'anthropic' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `embed_model` text;