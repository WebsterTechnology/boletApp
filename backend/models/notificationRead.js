module.exports = (sequelize, DataTypes) => {
  return sequelize.define("NotificationRead", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    notificationId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    readAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: "notification_reads",
    indexes: [{ unique: true, fields: ["notificationId", "userId"] }],
  });
};