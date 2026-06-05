CREATE TABLE "marker_neighbor" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "marker_neighbor_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"from_marker_id" integer NOT NULL,
	"to_marker_id" integer NOT NULL,
	"relation" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marker_neighbor" ADD CONSTRAINT "marker_neighbor_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marker_neighbor" ADD CONSTRAINT "marker_neighbor_from_marker_id_map_point_id_fk" FOREIGN KEY ("from_marker_id") REFERENCES "public"."map_point"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "marker_neighbor" ADD CONSTRAINT "marker_neighbor_to_marker_id_map_point_id_fk" FOREIGN KEY ("to_marker_id") REFERENCES "public"."map_point"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "marker_neighbor_map_id_idx" ON "marker_neighbor" USING btree ("map_id");
--> statement-breakpoint
CREATE INDEX "marker_neighbor_from_marker_id_idx" ON "marker_neighbor" USING btree ("from_marker_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "marker_neighbor_from_relation_idx" ON "marker_neighbor" USING btree ("map_id","from_marker_id","relation");
