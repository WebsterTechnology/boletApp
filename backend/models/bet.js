// models/Bet.js
module.exports = (sequelize, DataTypes) => {
  const Bet = sequelize.define(
    "Bet",
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },

      // what the user played
      game: { type: DataTypes.STRING, allowNull: false },           // e.g. 'yonchif' | 'maryaj' | 'twachif'
      numbers: { type: DataTypes.TEXT, allowNull: false },          // e.g. "12-34-56" (store however you prefer)

      // money
      stakeBRL: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      potentialWinBRL: { type: DataTypes.DECIMAL(10, 2), allowNull: true },

      // lifecycle
      status: {
        type: DataTypes.ENUM("pending", "won", "lost", "void", "paid", "cancelled"),
        defaultValue: "pending",
      },

      // optional result fields
      resultNumbers: { type: DataTypes.TEXT, allowNull: true },
      resolvedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "bets", timestamps: true }
  );

  Bet.associate = (models) => {
    Bet.belongsTo(models.User, { foreignKey: "userId" });
  };

  return Bet;
};
