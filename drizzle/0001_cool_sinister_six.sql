CREATE UNIQUE INDEX `idx_content_draft_slug` ON `content` (`kind`, json_extract(`draft`, '$.slug'));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_published_slug` ON `content` (`kind`, json_extract(`published`, '$.slug'));
