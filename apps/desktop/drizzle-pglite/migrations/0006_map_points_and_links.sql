CREATE TABLE "map_point" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "map_point_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"ref" varchar(64),
	"name" varchar(255),
	"category" varchar(32) DEFAULT 'custom' NOT NULL,
	"location" geometry(point) NOT NULL,
	"elevation" real,
	"elevation_source" varchar(32),
	"description" text,
	"parent_ref" varchar(64),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"image_x" real,
	"image_y" real,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_link" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "map_link_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"from_ref" varchar(64) NOT NULL,
	"to_ref" varchar(64) NOT NULL,
	"path_slug" varchar(128) NOT NULL,
	"start_fraction" real,
	"end_fraction" real,
	"bidirectional" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "map_point" ADD CONSTRAINT "map_point_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_link" ADD CONSTRAINT "map_link_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "map_point_map_id_idx" ON "map_point" USING btree ("map_id");--> statement-breakpoint
CREATE UNIQUE INDEX "map_point_map_ref_idx" ON "map_point" USING btree ("map_id","ref") WHERE "ref" is not null;--> statement-breakpoint
CREATE INDEX "map_link_map_id_idx" ON "map_link" USING btree ("map_id");--> statement-breakpoint
CREATE UNIQUE INDEX "map_link_edge_idx" ON "map_link" USING btree ("map_id","from_ref","to_ref","path_slug");
