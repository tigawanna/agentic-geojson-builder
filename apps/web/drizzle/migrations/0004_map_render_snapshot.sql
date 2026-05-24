CREATE TABLE "map_render_snapshot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "map_render_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"source" varchar(32) DEFAULT 'client' NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "map_render_snapshot" ADD CONSTRAINT "map_render_snapshot_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "map_render_snapshot_map_id_uidx" ON "map_render_snapshot" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "map_render_snapshot_captured_at_idx" ON "map_render_snapshot" USING btree ("captured_at");
