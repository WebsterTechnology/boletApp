import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Where backend-ts lives. Defaults to the sibling folder in this repo; set
 * BACKEND_TS_DIR to test against a checkout elsewhere (e.g. another branch).
 */
export const BACKEND_DIR = path.resolve(
  process.env.BACKEND_TS_DIR ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../backend-ts")
);

export const backendAvailable =
  fs.existsSync(path.join(BACKEND_DIR, "src", "app.ts")) &&
  fs.existsSync(path.join(BACKEND_DIR, "node_modules", "express"));

if (!backendAvailable) {
  console.warn(
    `[contract] backend-ts source not found at ${BACKEND_DIR} (need src/app.ts and node_modules). ` +
      "Contract tests are skipped. Set BACKEND_TS_DIR to a backend-ts checkout with dependencies installed."
  );
}

const fromBackend = (file: string) => pathToFileURL(path.join(BACKEND_DIR, "src", file)).href;

/**
 * Starts the real backend-ts Express app on a random port.
 * Without a database URL it points Sequelize at a closed port: routes still match and
 * answer (401/400/500), which is all the route contract needs.
 */
export async function startBackend(databaseUrl?: string) {
  process.env.DATABASE_URL = databaseUrl ?? "postgres://contract:test@127.0.0.1:1/none";
  process.env.JWT_SECRET ??= "contract-test-secret";
  process.env.DB_SSL ??= "false";
  process.env.NODE_ENV ??= "test";

  const { default: app } = await import(/* @vite-ignore */ fromBackend("app.ts"));
  const { sequelize } = await import(/* @vite-ignore */ fromBackend("models/index.ts"));

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    sequelize,
    async stop() {
      await new Promise((r) => server.close(r));
      await sequelize.close().catch(() => {});
    },
  };
}
