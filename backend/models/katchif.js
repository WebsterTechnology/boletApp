module.exports = (sequelize, DataTypes) => {
  const Katchif = sequelize.define(
    "Katchif",
    {
      number: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^\d{4}$/, // ✅ exactly 4 digits
        },
      },
      pwen: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      location: {
        type: DataTypes.ENUM("New York", "Florida"),
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // ✅ Admin decision persistence
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
      tableName: "katchif", // ✅ explicit table name (recommended)
      timestamps: true,     // createdAt / updatedAt
      indexes: [
        { fields: ["userId"] },
        { fields: ["status"] },
      ],
    }
  );

  Katchif.associate = (models) => {
    Katchif.belongsTo(models.User, { foreignKey: "userId" });
  };

  return Katchif;
};
