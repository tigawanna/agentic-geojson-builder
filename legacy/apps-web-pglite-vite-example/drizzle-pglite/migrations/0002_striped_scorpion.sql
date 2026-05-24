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
ALTER TABLE "control_point" ADD CONSTRAINT "control_point_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;