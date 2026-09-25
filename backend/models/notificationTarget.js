module.exports = (sequelize, DataTypes) => {
  return sequelize.define("NotificationTarget", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    notificationId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: "notification_targets",
    timestamps: true,
    indexes: [{ fields: ["userId"] }],
  });
};
