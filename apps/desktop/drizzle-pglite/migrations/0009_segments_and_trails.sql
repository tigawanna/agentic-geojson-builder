ALTER TABLE "map_point" ADD COLUMN "node_role" varchar(16);--> statement-breakpoint
ALTER TABLE "map_link" RENAME TO "segment_edge";--> statement-breakpoint
ALTER TABLE "segment_edge" ADD COLUMN "geometry_json" jsonb;--> statement-breakpoint
ALTER TABLE "segment_edge" ADD COLUMN "length_m" real;--> statement-breakpoint
ALTER TABLE "segment_edge" ADD COLUMN "kind" varchar(32) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "segment_edge" ADD COLUMN "status" varchar(32) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "segment_edge" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER INDEX "map_link_map_id_idx" RENAME TO "segment_edge_map_id_idx";--> statement-breakpoint
ALTER INDEX "map_link_edge_idx" RENAME TO "segment_edge_edge_idx";--> statement-breakpoint
CREATE TABLE "trail" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trail_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(255),
	"kind" varchar(32) DEFAULT 'route' NOT NULL,
	"color" varchar(16),
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trail_member" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trail_member_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trail_id" integer NOT NULL,
	"segment_edge_id" integer NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"direction" varchar(8) DEFAULT 'forward' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trail" ADD CONSTRAINT "trail_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail_member" ADD CONSTRAINT "trail_member_trail_id_trail_id_fk" FOREIGN KEY ("trail_id") REFERENCES "public"."trail"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail_member" ADD CONSTRAINT "trail_member_segment_edge_id_segment_edge_id_fk" FOREIGN KEY ("segment_edge_id") REFERENCES "public"."segment_edge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trail_map_id_idx" ON "trail" USING btree ("map_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trail_map_slug_idx" ON "trail" USING btree ("map_id","slug");--> statement-breakpoint
CREATE INDEX "trail_member_trail_id_idx" ON "trail_member" USING btree ("trail_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trail_member_trail_order_idx" ON "trail_member" USING btree ("trail_id","order_index");
