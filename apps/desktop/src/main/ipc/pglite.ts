import { sql } from "drizzle-orm";
import type { IpcChannel, IpcRequest, IpcResponse } from "../../shared/ipc-contract.js";
import { getPgliteClient, getPgliteDb } from "../lib/pglite/client.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

export const pgliteHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "db:ping": async () => {
    const db = getPgliteDb();
    const result = await db.execute(sql`select 1 as ok`);
    const row = result.rows[0] as { ok: number } | undefined;
    return { ok: row?.ok === 1 };
  },
  "db:all": async ({ sql: query, params }) => {
    const client = getPgliteClient();
    const result = await client.query(query, params ?? []);
    return result.rows as unknown[];
  },
  "db:get": async ({ sql: query, params }) => {
    const client = getPgliteClient();
    const result = await client.query(query, params ?? []);
    return (result.rows[0] as unknown) ?? null;
  },
  "db:run": async ({ sql: query, params }) => {
    const client = getPgliteClient();
    const result = await client.query(query, params ?? []);
    return {
      changes: result.affectedRows ?? 0,
      lastInsertRowid: 0,
    };
  },
};
