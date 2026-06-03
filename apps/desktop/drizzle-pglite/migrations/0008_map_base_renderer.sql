ALTER TABLE "map" ADD COLUMN "base_renderer" varchar(16) DEFAULT 'leaflet' NOT NULL;--> statement-breakpoint
ALTER TABLE "map" ADD COLUMN "mapbox_gl_style" varchar(32);
