CREATE TABLE "georeference" (
	"map_id" integer PRIMARY KEY NOT NULL,
	"method" varchar(32) DEFAULT 'affine' NOT NULL,
	"coefficients" jsonb NOT NULL,
	"control_point_count" integer NOT NULL,
	"residual_error_meters" real NOT NULL,
	"max_error_meters" real NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "georeference" ADD CONSTRAINT "georeference_map_id_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."map"("id") ON DELETE cascade ON UPDATE no action;