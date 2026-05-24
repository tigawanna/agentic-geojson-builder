import {
  experimentsCollection,
  experimentsCollectionMetaQueryOptions,
} from "@/data-access-layer/experiments/query-collection";
import { gt, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function TestList() {
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const { data } = useLiveSuspenseQuery(
    (q) =>
      q
        .from({ exp: experimentsCollection })
        .where(({ exp }) => gt(exp.id, String(nextCursor ?? 0)))
        .orderBy(({ exp }) => exp.id, "asc")
        .limit(12),
    [nextCursor],
  );
  const metaQuery = useSuspenseQuery(experimentsCollectionMetaQueryOptions);
  console.log("Meta query data:", metaQuery.data);
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Experiment List</h1>
      <ul className="mt-4 flex size-full flex-wrap items-start justify-center gap-4">
        {data.map((item) => (
          <li key={item.id} className="w-[23%] rounded border bg-base-200 p-4">
            <h2 className="card-body text-3xl font-semibold">{item.name}</h2>
          </li>
        ))}
      </ul>
      {metaQuery.data?.nextCursor && (
        <button
          onClick={() => setNextCursor(Number(metaQuery.data?.nextCursor))}
          className="mt-4 rounded bg-blue-500 p-2 text-white"
        >
          Load More
        </button>
      )}
    </div>
  );
}
