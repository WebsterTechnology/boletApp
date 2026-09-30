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
  corsOrigins: (process.env.CORS_ORIGINS || "*")
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

/** Value for the `cors` / socket.io `origin` option. */
export const corsOrigin: string | string[] =
  env.corsOrigins.length === 0 || env.corsOrigins.includes("*") ? "*" : env.corsOrigins;
