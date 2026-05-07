CREATE TABLE `agent_run` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`tool_name` text NOT NULL,
	`model` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`summary` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `map_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_run_projectId_idx` ON `agent_run` (`project_id`);--> statement-breakpoint
CREATE INDEX `agent_run_status_idx` ON `agent_run` (`status`);--> statement-breakpoint
CREATE TABLE `control_point` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`source_asset_id` text NOT NULL,
	`image_x` real NOT NULL,
	`image_y` real NOT NULL,
	`longitude` real NOT NULL,
	`latitude` real NOT NULL,
	`residual_error_meters` real,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `map_project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_asset_id`) REFERENCES `source_asset`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `control_point_projectId_idx` ON `control_point` (`project_id`);--> statement-breakpoint
CREATE INDEX `control_point_sourceAssetId_idx` ON `control_point` (`source_asset_id`);--> statement-breakpoint
CREATE TABLE `geo_feature` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`source_asset_id` text,
	`agent_run_id` text,
	`geometry` text,
	`properties` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `map_project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_asset_id`) REFERENCES `source_asset`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `geo_feature_projectId_idx` ON `geo_feature` (`project_id`);--> statement-breakpoint
CREATE INDEX `geo_feature_status_idx` ON `geo_feature` (`status`);--> statement-breakpoint
CREATE INDEX `geo_feature_sourceAssetId_idx` ON `geo_feature` (`source_asset_id`);--> statement-breakpoint
CREATE TABLE `georeference` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`source_asset_id` text NOT NULL,
	`method` text DEFAULT 'unplaced' NOT NULL,
	`residual_error_meters` real,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `map_project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_asset_id`) REFERENCES `source_asset`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `georeference_projectId_idx` ON `georeference` (`project_id`);--> statement-breakpoint
CREATE INDEX `georeference_sourceAssetId_idx` ON `georeference` (`source_asset_id`);--> statement-breakpoint
CREATE TABLE `map_project` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`location_hint` text,
	`default_base_map` text DEFAULT 'leaflet-osm' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `map_project_ownerId_idx` ON `map_project` (`owner_id`);--> statement-breakpoint
CREATE INDEX `map_project_updatedAt_idx` ON `map_project` (`updated_at`);--> statement-breakpoint
CREATE TABLE `project_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`parent_revision_id` text,
	`created_by_user_id` text,
	`agent_run_id` text,
	`label` text NOT NULL,
	`feature_collection` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `map_project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`agent_run_id`) REFERENCES `agent_run`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_revision_projectId_idx` ON `project_revision` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_revision_createdAt_idx` ON `project_revision` (`created_at`);--> statement-breakpoint
CREATE TABLE `source_asset` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`file_name` text NOT NULL,
	`storage_key` text NOT NULL,
	`page_count` integer,
	`width` real,
	`height` real,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `map_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `source_asset_projectId_idx` ON `source_asset` (`project_id`);--> statement-breakpoint
CREATE INDEX `source_asset_createdAt_idx` ON `source_asset` (`created_at`);--> statement-breakpoint
DROP TABLE `resume`;--> statement-breakpoint
DROP TABLE `resume_section`;--> statement-breakpoint
DROP TABLE `resume_certification`;--> statement-breakpoint
DROP TABLE `resume_contact`;--> statement-breakpoint
DROP TABLE `resume_education`;--> statement-breakpoint
DROP TABLE `resume_education_bullet`;--> statement-breakpoint
DROP TABLE `resume_experience`;--> statement-breakpoint
DROP TABLE `resume_experience_bullet`;--> statement-breakpoint
DROP TABLE `resume_language`;--> statement-breakpoint
DROP TABLE `resume_link`;--> statement-breakpoint
DROP TABLE `resume_project`;--> statement-breakpoint
DROP TABLE `resume_skill`;--> statement-breakpoint
DROP TABLE `resume_skill_group`;--> statement-breakpoint
DROP TABLE `resume_summary`;--> statement-breakpoint
DROP TABLE `resume_talk`;--> statement-breakpoint
DROP TABLE `resume_volunteer`;--> statement-breakpoint
DROP TABLE `saved_project`;