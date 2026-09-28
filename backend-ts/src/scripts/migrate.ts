import { sequelize } from "../config/database";
import { migrator } from "../migrations";

async function main() {
  const direction = process.argv[2] ?? "up";
  if (direction === "up") await migrator.up();
  else if (direction === "down") await migrator.down();
  else throw new Error(`Unknown direction "${direction}" (expected "up" or "down")`);
}

main()
  .then(() => sequelize.close())
  .catch(async (err) => {
    console.error("❌ Migration failed:", err);
    await sequelize.close();
    process.exit(1);
  });
