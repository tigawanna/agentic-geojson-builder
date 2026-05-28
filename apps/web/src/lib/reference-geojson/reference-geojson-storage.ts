import type { MapReferenceGeoJsonRecord } from "./reference-geojson.types";

const DB_NAME = "agentic-geojson-builder";
const DB_VERSION = 1;
const STORE_NAME = "mapReferenceGeoJson";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Could not open local reference GeoJSON database."));
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("mapId", "mapId", { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  return openDatabase().then(
    (database) =>
      new Promise<T | void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = runner(store);

        transaction.oncomplete = () => {
          if (!request) {
            resolve();
            return;
          }
          resolve((request as IDBRequest<T>).result);
        };

        transaction.onerror = () => {
          reject(transaction.error ?? new Error("Reference GeoJSON storage transaction failed."));
        };

        if (request) {
          request.onerror = () => {
            reject(request.error ?? new Error("Reference GeoJSON storage request failed."));
          };
        }
      }),
  );
}

export function listMapReferenceGeoJson(mapId: number): Promise<MapReferenceGeoJsonRecord[]> {
  return runTransaction("readonly", (store) => store.index("mapId").getAll(mapId)).then(
    (records) => {
      const list = (records as MapReferenceGeoJsonRecord[] | void) ?? [];
      return list.sort((left, right) => right.importedAt.localeCompare(left.importedAt));
    },
  );
}

export function saveMapReferenceGeoJson(record: MapReferenceGeoJsonRecord): Promise<void> {
  return runTransaction("readwrite", (store) => store.put(record)).then(() => undefined);
}

export function deleteMapReferenceGeoJson(id: string): Promise<void> {
  return runTransaction("readwrite", (store) => store.delete(id)).then(() => undefined);
}

export async function setMapReferenceGeoJsonVisibility(
  id: string,
  visible: boolean,
): Promise<MapReferenceGeoJsonRecord | null> {
  const record = await runTransaction("readonly", (store) => store.get(id));
  if (!record) {
    return null;
  }

  const updated: MapReferenceGeoJsonRecord = {
    ...(record as MapReferenceGeoJsonRecord),
    visible,
  };
  await saveMapReferenceGeoJson(updated);
  return updated;
}
