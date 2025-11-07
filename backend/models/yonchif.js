// // models/yonchif.js
// module.exports = (sequelize, DataTypes) => {
//   const YonChif = sequelize.define("YonChif", {
//     number: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     pwen: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     location: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     userId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//   });

//   return YonChif;
// };

// models/yonchif.js
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

      // ✅ NEW: status saved in DB, default "pending"
      status: {
        type: DataTypes.ENUM("pending", "won", "lost", "paid", "void", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "yon_chif",     // keep if this is your table name
      timestamps: true,          // createdAt / updatedAt (needed for sorting in UI)
      indexes: [
        { fields: ["userId"] },
        { fields: ["status"] },
      ],
    }
  );

  YonChif.associate = (models) => {
    YonChif.belongsTo(models.User, { foreignKey: "userId" });
  };

  return YonChif;
};
