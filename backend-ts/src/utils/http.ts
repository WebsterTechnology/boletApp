/** First string value of a query parameter (`?a=1&a=2` -> "1"). */
export function queryString(value: unknown): string | undefined {
  if (Array.isArray(value)) return queryString(value[0]);
  return typeof value === "string" ? value : undefined;
}
