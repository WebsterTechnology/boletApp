import dotenv from "dotenv";

dotenv.config({ quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 8000,
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  dbSsl: process.env.DB_SSL !== "false",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:8081,http://localhost:8082")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  asaasApiKey: process.env.ASAAS_API_KEY,
  asaasWebhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
  asaasBaseUrl:
    process.env.ASAAS_BASE_URL ||
    (process.env.ASAAS_ENV === "production"
      ? "https://www.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3"),
  asaasEnv: process.env.ASAAS_ENV,
  infinitepayHandle: process.env.INFINITEPAY_HANDLE || "laurius-debrune",
  koyebAppId: process.env.KOYEB_APP_ID,
};

/** Value for the `cors` / socket.io `origin` option. Wildcard origins are intentionally rejected. */
if (env.corsOrigins.includes("*")) {
  throw new Error("CORS_ORIGINS must list explicit trusted origins; wildcard * is not allowed");
}

export const corsOrigin: string[] = env.corsOrigins;
