module.exports = (sequelize, DataTypes) => {
  const YonChif = sequelize.define(
    "YonChif",
    {
      number: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      pwen: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // NEW
      receiptId: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "pending",
          "won",
          "lost",
          "paid",
          "void",
          "cancelled"
        ),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "yon_chif",
      timestamps: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["receiptId"] }, // NEW
        { fields: ["status"] },
      ],
    }
  );

  YonChif.associate = (models) => {
    YonChif.belongsTo(models.User, {
      foreignKey: "userId",
    });
  };

  return YonChif;
};