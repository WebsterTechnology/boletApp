module.exports = (sequelize, DataTypes) => {
  const DeChif = sequelize.define(
    "DeChif",
    {
      number: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isTwoDigits(value) {
            // Must be exactly 2 digits (00–99)
            if (!/^\d{2}$/.test(value)) {
              throw new Error("DeChif number must be exactly 2 digits (00–99)");
            }
          },
        },
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
      tableName: "de_chif",
      timestamps: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["status"] },
        { fields: ["number"] },
      ],
    }
  );

  DeChif.associate = (models) => {
    DeChif.belongsTo(models.User, { foreignKey: "userId" });
  };

  return DeChif;
};
