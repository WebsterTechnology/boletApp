import { sequelize } from "../config/database";
import { initUser, User } from "./User";
import { ChatMessage, initChatMessage } from "./ChatMessage";
import { WithdrawalRequest, initWithdrawalRequest } from "./WithdrawalRequest";
import { DeChif, initBets, Katchif, Maryaj, TwaChif, YonChif } from "./bets";
import { initPayments, PixPayment, PixPaymentRequest, Pwen } from "./payments";
import { initWinClaim, WinClaim } from "./WinClaim";
import {
  initNotifications,
  Notification,
  NotificationRead,
  NotificationTarget,
} from "./notifications";

initUser(sequelize);
initBets(sequelize);
initPayments(sequelize);
initWinClaim(sequelize);
initNotifications(sequelize);
initChatMessage(sequelize);
initWithdrawalRequest(sequelize);

// ==================== ASSOCIATIONS ====================
User.hasMany(ChatMessage, { foreignKey: "userId", onDelete: "CASCADE" });
User.hasMany(WithdrawalRequest, { foreignKey: "userId", onDelete: "CASCADE" });
WithdrawalRequest.belongsTo(User, { foreignKey: "userId" });
ChatMessage.belongsTo(User, { foreignKey: "userId" });
for (const BetModel of [YonChif, DeChif, TwaChif, Maryaj, Katchif] as unknown as (typeof YonChif)[]) {
  User.hasMany(BetModel, { foreignKey: "userId" });
  BetModel.belongsTo(User, { foreignKey: "userId" });
}

User.hasMany(PixPayment, { foreignKey: "userId", as: "pixPayments" });
PixPayment.belongsTo(User, { foreignKey: "userId", as: "user" });
// ../backend/routes/adminRoutes.js adds this un-aliased association at load time, and the
// admin payment endpoints rely on it (they include User without `as` and read `p.User`).
PixPayment.belongsTo(User, { foreignKey: "userId" });

User.hasMany(PixPaymentRequest, { foreignKey: "userId", as: "pixPaymentRequests" });
PixPaymentRequest.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(WinClaim, { foreignKey: "userId" });
WinClaim.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Pwen, { foreignKey: "userId", as: "pwenTransactions" });
Pwen.belongsTo(User, { foreignKey: "userId", as: "user" });

Notification.hasMany(NotificationRead, { foreignKey: "notificationId", onDelete: "CASCADE" });
NotificationRead.belongsTo(Notification, { foreignKey: "notificationId" });
User.hasMany(NotificationRead, { foreignKey: "userId", onDelete: "CASCADE" });
NotificationRead.belongsTo(User, { foreignKey: "userId" });
Notification.hasOne(NotificationTarget, {
  foreignKey: "notificationId",
  as: "target",
  onDelete: "CASCADE",
});
NotificationTarget.belongsTo(Notification, { foreignKey: "notificationId" });
User.hasMany(NotificationTarget, { foreignKey: "userId", onDelete: "CASCADE" });
NotificationTarget.belongsTo(User, { foreignKey: "userId", as: "user" });

export {
  sequelize,
  User,
  YonChif,
  DeChif,
  TwaChif,
  Maryaj,
  Katchif,
  PixPayment,
  PixPaymentRequest,
  Pwen,
  WinClaim,
  Notification,
  NotificationRead,
  NotificationTarget,
  ChatMessage,
  WithdrawalRequest,
};
