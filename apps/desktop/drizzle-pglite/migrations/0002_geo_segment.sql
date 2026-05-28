CREATE TABLE "geo_segment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "geo_segment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"segment_group_id" varchar(128) NOT NULL,
	"segment_index" integer DEFAULT 0 NOT NULL,
	"name" varchar(255),
	"path_kind" varchar(32) DEFAULT 'unknown' NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"coordinate_space" varchar(32) DEFAULT 'wgs84' NOT NULL,
	"geometry_json" jsonb NOT NULL,
	"confidence" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geo_segment" ADD CONSTRAINT "geo_segment_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "geo_segment_map_id_idx" ON "geo_segment" USING btree ("map_id");
--> statement-breakpoint
CREATE INDEX "geo_segment_map_group_idx" ON "geo_segment" USING btree ("map_id","segment_group_id");
