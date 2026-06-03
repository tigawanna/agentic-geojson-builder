CREATE TABLE "mapbox_ground_capture" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mapbox_ground_capture_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" varchar(255) NOT NULL,
	"tags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"location" geometry(point) NOT NULL,
	"elevation" real,
	"layer_id" varchar(128),
	"source_layer" varchar(128),
	"base_map_style" varchar(64),
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mapbox_ground_capture_approved_idx" ON "mapbox_ground_capture" USING btree ("approved");
--> statement-breakpoint
CREATE INDEX "mapbox_ground_capture_created_at_idx" ON "mapbox_ground_capture" USING btree ("created_at");
