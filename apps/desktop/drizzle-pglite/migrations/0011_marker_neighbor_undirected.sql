DELETE FROM "marker_neighbor" AS "a"
USING "marker_neighbor" AS "b"
WHERE "a"."id" > "b"."id"
  AND "a"."map_id" = "b"."map_id"
  AND "a"."from_marker_id" = "b"."from_marker_id"
  AND "a"."to_marker_id" = "b"."to_marker_id";
--> statement-breakpoint
DROP INDEX "marker_neighbor_from_relation_idx";
--> statement-breakpoint
ALTER TABLE "marker_neighbor" DROP COLUMN "relation";
--> statement-breakpoint
CREATE UNIQUE INDEX "marker_neighbor_edge_idx" ON "marker_neighbor" USING btree ("map_id","from_marker_id","to_marker_id");
