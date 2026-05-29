CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" integer NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(16) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"source" varchar(32) DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_map_id_idx" ON "audit_log" USING btree ("map_id");
--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
