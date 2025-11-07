// models/winclaim.js
module.exports = (sequelize, DataTypes) => {
  const WinClaim = sequelize.define(
    "WinClaim",
    {
      userId:  { type: DataTypes.INTEGER, allowNull: false },
      betType: { type: DataTypes.ENUM("yonchif", "maryaj", "twachif"), allowNull: false },
      betId:   { type: DataTypes.INTEGER, allowNull: false },

      method:  { type: DataTypes.ENUM("points", "pix"), allowNull: false }, // <-- was "choice"
      pixKey:  { type: DataTypes.STRING, allowNull: true },

      pwen:    { type: DataTypes.INTEGER, allowNull: false }, // <-- prize points

      status:  {
        type: DataTypes.ENUM("pending", "approved", "rejected", "paid"),
        defaultValue: "pending",
      },

      notes:   { type: DataTypes.STRING },
    },
    {
      indexes: [{ unique: true, fields: ["betType", "betId"] }], // avoid duplicate claims
    }
  );

  WinClaim.associate = (models) => {
    WinClaim.belongsTo(models.User, { foreignKey: "userId" });
  };

  return WinClaim;
};
