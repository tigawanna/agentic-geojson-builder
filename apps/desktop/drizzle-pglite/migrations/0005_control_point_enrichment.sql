ALTER TABLE "control_point" ADD COLUMN "pole_number" varchar(64);--> statement-breakpoint
ALTER TABLE "control_point" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "control_point" ADD COLUMN "altitude_m" real;--> statement-breakpoint
ALTER TABLE "control_point" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "control_point" ADD COLUMN "context_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "control_point" ADD COLUMN "source_segment_id" integer REFERENCES "geo_segment"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE TABLE "control_point_attachment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "control_point_attachment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"control_point_id" integer NOT NULL,
	"file_path" varchar(1024) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"caption" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "control_point_attachment" ADD CONSTRAINT "control_point_attachment_control_point_id_fk" FOREIGN KEY ("control_point_id") REFERENCES "public"."control_point"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "control_point_attachment_cp_id_idx" ON "control_point_attachment" USING btree ("control_point_id");
