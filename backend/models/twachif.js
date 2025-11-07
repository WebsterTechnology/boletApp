// module.exports = (sequelize, DataTypes) => {
//   const TwaChif = sequelize.define("TwaChif", {
//     number: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       validate: {
//         is: /^\d{3}$/, // must be exactly 3 digits
//       },
//     },
//     pwen: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     location: {
//       type: DataTypes.ENUM("New York", "Florida"),
//       allowNull: false,
//     },
//     userId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     }
//   }, {
//     timestamps: true,
//   });

//   return TwaChif;
// };
module.exports = (sequelize, DataTypes) => {
  const TwaChif = sequelize.define(
    "TwaChif",
    {
      number: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^\d{3}$/, // exactly 3 digits
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

      // ✅ NEW: persists admin decisions
      status: {
        type: DataTypes.ENUM("pending", "won", "lost", "paid", "void", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "twa_chif",     // keep or remove if you use default pluralization
      timestamps: true,          // createdAt / updatedAt
      indexes: [
        { fields: ["userId"] },
        { fields: ["status"] },
      ],
    }
  );

  TwaChif.associate = (models) => {
    TwaChif.belongsTo(models.User, { foreignKey: "userId" });
  };

  return TwaChif;
};
