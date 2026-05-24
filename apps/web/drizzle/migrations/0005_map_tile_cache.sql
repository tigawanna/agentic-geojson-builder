CREATE TABLE "map_tile_cache" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "map_tile_cache_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"center_lat" real NOT NULL,
	"center_lng" real NOT NULL,
	"half_side_meters" real NOT NULL,
	"min_zoom" integer DEFAULT 14 NOT NULL,
	"max_zoom" integer DEFAULT 17 NOT NULL,
	"style" varchar(32) DEFAULT 'satellite' NOT NULL,
	"tile_count" integer DEFAULT 0 NOT NULL,
	"built_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "map_tile_cache" ADD CONSTRAINT "map_tile_cache_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "map_tile_cache_map_id_uidx" ON "map_tile_cache" USING btree ("map_id");
