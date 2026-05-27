import { app } from "electron";
import { join } from "node:path";
import { initLogger, log } from "evlog";
import { createFsDrain } from "evlog/fs";

let initialized = false;

export function getLogDir(): string {
  return join(app.getPath("userData"), ".evlog", "logs");
}

export function initAppLogger(): void {
  if (initialized) {
    return;
  }

  initialized = true;

  const logDir = getLogDir();
  const isDev = !app.isPackaged;

  initLogger({
    env: {
      service: "agentic-geojson-desktop",
      environment: isDev ? "development" : "production",
      version: app.getVersion(),
    },
    pretty: isDev,
    drain: createFsDrain({
      dir: logDir,
      maxFiles: 14,
      pretty: isDev,
    }),
  });

  log.info({
    action: "logger",
    message: "evlog file drain initialized",
    logDir,
  });
}

export { log };
