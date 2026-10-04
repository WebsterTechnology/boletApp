import type { QueryInterface } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";
import { sequelize } from "../config/database";
import addGeorgiaToLocation from "./20260303015734-add-georgia-to-location";
import addReceiptIdToAllBets from "./20260626053315-add-receipt-id-to-all-bets";
import addUserProfileColumns from "./20260928000000-add-user-profile-columns";
import addChatMessages from "./20261004000000-add-chat-messages";

// Names keep the ".js" suffix that sequelize-cli recorded in SequelizeMeta, so migrations
// already applied by ../backend are recognised and not run twice.
const migrations = [
  { name: "20260303015734-add-georgia-to-location.js", ...addGeorgiaToLocation },
  { name: "20260626053315-add-receipt-id-to-all-bets.js", ...addReceiptIdToAllBets },
  { name: "20260928000000-add-user-profile-columns.js", ...addUserProfileColumns },
  { name: "20261004000000-add-chat-messages.js", ...addChatMessages },
];

export const migrator = new Umzug<QueryInterface>({
  migrations,
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: "SequelizeMeta" }),
  logger: console,
});
