// module.exports = (sequelize, DataTypes) => {
//   const Maryaj = sequelize.define("Maryaj", {
//     part1: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       validate: {
//         is: /^\d{2}$/, // must be 2 digits
//       },
//     },
//     part2: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       validate: {
//         is: /^\d{2}$/, // must be 2 digits
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

//   return Maryaj;
// };
module.exports = (sequelize, DataTypes) => {
  const Maryaj = sequelize.define(
    "Maryaj",
    {
      part1: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { is: /^\d{2}$/ }, // exactly 2 digits
      },
      part2: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { is: /^\d{2}$/ }, // exactly 2 digits
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

      // ✅ NEW: admin can set won/lost/paid, etc.
      status: {
        type: DataTypes.ENUM("pending", "won", "lost", "paid", "void", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "maryaj",
      timestamps: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["status"] },
      ],
    }
  );

  Maryaj.associate = (models) => {
    Maryaj.belongsTo(models.User, { foreignKey: "userId" });
  };

  return Maryaj;
};
