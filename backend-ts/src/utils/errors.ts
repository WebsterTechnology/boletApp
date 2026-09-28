import { isAxiosError } from "axios";

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Response body from a failed provider call, or the plain error message. */
export function providerErrorData(err: unknown): unknown {
  return isAxiosError(err) ? (err.response?.data ?? err.message) : errorMessage(err);
}

interface ProviderErrorBody {
  errors?: { description?: string }[];
  message?: string;
}

/** Best human-readable message from an Asaas-style error response. */
export function providerErrorMessage(err: unknown): string {
  if (isAxiosError<ProviderErrorBody>(err)) {
    const data = err.response?.data;
    return data?.errors?.[0]?.description || data?.message || err.message;
  }
  return errorMessage(err);
}
