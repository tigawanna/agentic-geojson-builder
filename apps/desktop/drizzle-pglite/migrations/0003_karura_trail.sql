CREATE TABLE "karura_trails" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "karura_trails_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(255) NOT NULL,
	"trailfork_id" integer,
	"name" varchar(255) NOT NULL,
	"source" varchar(32) DEFAULT 'trailfork' NOT NULL,
	"geometry_source" varchar(16) NOT NULL,
	"properties" jsonb NOT NULL,
	"geometry_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "karura_trails_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "karura_trails_trailfork_id_idx" ON "karura_trails" USING btree ("trailfork_id");
--> statement-breakpoint
CREATE INDEX "karura_trails_source_idx" ON "karura_trails" USING btree ("source");
