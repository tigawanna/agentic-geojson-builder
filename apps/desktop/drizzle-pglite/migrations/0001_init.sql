CREATE TABLE "control_point" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "control_point_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"label" varchar(255),
	"image_x" real NOT NULL,
	"image_y" real NOT NULL,
	"location" geometry(point) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "map_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" varchar(1024),
	"folder_path" varchar(1024),
	"location_query" varchar(512),
	"map_center_lat" real,
	"map_center_lng" real,
	"map_zoom" real,
	"base_map_style" varchar(32) DEFAULT 'satellite' NOT NULL,
	"pdf_scale" real DEFAULT 1 NOT NULL,
	"pdf_rotation" real DEFAULT 0 NOT NULL,
	"pdf_pan_x" real DEFAULT 0 NOT NULL,
	"pdf_pan_y" real DEFAULT 0 NOT NULL,
	"pdf_file_name" varchar(512),
	"pdf_data" "bytea",
	"pdf_page_count" integer,
	"thumbnail_file_name" varchar(512),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_tile_cache" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "map_tile_cache_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"center_lat" real NOT NULL,
	"center_lng" real NOT NULL,
	"half_side_meters" real NOT NULL,
	"bounds_north" real NOT NULL,
	"bounds_south" real NOT NULL,
	"bounds_east" real NOT NULL,
	"bounds_west" real NOT NULL,
	"min_zoom" integer DEFAULT 14 NOT NULL,
	"max_zoom" integer DEFAULT 17 NOT NULL,
	"style" varchar(32) DEFAULT 'satellite' NOT NULL,
	"tile_count" integer DEFAULT 0 NOT NULL,
	"built_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "control_point" ADD CONSTRAINT "control_point_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_tile_cache" ADD CONSTRAINT "map_tile_cache_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "map_tile_cache_map_id_uidx" ON "map_tile_cache" USING btree ("map_id");