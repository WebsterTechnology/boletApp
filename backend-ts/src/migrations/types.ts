import type { QueryInterface } from "sequelize";
import type { MigrationFn } from "umzug";

export interface Migration {
  up: MigrationFn<QueryInterface>;
  down: MigrationFn<QueryInterface>;
}

/** Column names of a table, or null when the table does not exist yet. */
export async function columnsOf(qi: QueryInterface, table: string): Promise<Set<string> | null> {
  try {
    return new Set(Object.keys(await qi.describeTable(table)));
  } catch {
    return null;
  }
}
