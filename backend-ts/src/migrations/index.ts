import type { QueryInterface } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";
import { sequelize } from "../config/database";
import addGeorgiaToLocation from "./20260303015734-add-georgia-to-location";
import addReceiptIdToAllBets from "./20260626053315-add-receipt-id-to-all-bets";
import addUserProfileColumns from "./20260928000000-add-user-profile-columns";
import addChatMessages from "./20261004000000-add-chat-messages";
import addWithdrawablePoints from "./20261004010000-add-withdrawable-points";
import addWithdrawalRequests from "./20261004011000-add-withdrawal-requests";
import createSolFoundation from "./20261018000000-create-sol-foundation";
import createSolPaymentAttempts from "./20261018010000-create-sol-payment-attempts";
import solOpenIntentUniqueIndex from "./20261018020000-sol-open-intent-unique-index";
import adminArchivedReceipts from "./20261019000000-admin-archived-receipts";
import solWalletLedger from "./20261020000000-sol-wallet-ledger";

// Names keep the ".js" suffix that sequelize-cli recorded in SequelizeMeta, so migrations
// already applied by ../backend are recognised and not run twice.
const migrations = [
  { name: "20260303015734-add-georgia-to-location.js", ...addGeorgiaToLocation },
  { name: "20260626053315-add-receipt-id-to-all-bets.js", ...addReceiptIdToAllBets },
  { name: "20260928000000-add-user-profile-columns.js", ...addUserProfileColumns },
  { name: "20261004000000-add-chat-messages.js", ...addChatMessages },
  { name: "20261004010000-add-withdrawable-points.js", ...addWithdrawablePoints },
  { name: "20261004011000-add-withdrawal-requests.js", ...addWithdrawalRequests },
  { name: "20261018000000-create-sol-foundation.js", ...createSolFoundation },
  { name: "20261018010000-create-sol-payment-attempts.js", ...createSolPaymentAttempts },
  { name: "20261018020000-sol-open-intent-unique-index.js", ...solOpenIntentUniqueIndex },
  { name: "20261019000000-admin-archived-receipts.js", ...adminArchivedReceipts },
  { name: "20261020000000-sol-wallet-ledger.js", ...solWalletLedger },
];

export const migrator = new Umzug<QueryInterface>({
  migrations,
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: "SequelizeMeta" }),
  logger: console,
});
