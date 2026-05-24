ALTER TABLE "map" ADD COLUMN "location_query" varchar(512);--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "map_center_lat" real;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "map_center_lng" real;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "map_zoom" real;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "base_map_style" varchar(32) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "pdf_scale" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "pdf_rotation" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "pdf_pan_x" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "pdf_pan_y" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "pdf_file_name" varchar(512);--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "pdf_data" "bytea";--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "pdf_page_count" integer;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;