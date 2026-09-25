module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Notification", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(160), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    priority: {
      type: DataTypes.ENUM("info", "warning", "critical"),
      allowNull: false,
      defaultValue: "info",
    },
    imageUrl: { type: DataTypes.TEXT, allowNull: true },
    linkUrl: { type: DataTypes.TEXT, allowNull: true },
    recipientType: { type: DataTypes.ENUM("all", "user"), allowNull: false, defaultValue: "all" },
    recipientUserId: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: "notifications",
  });
};