module.exports = (sequelize, DataTypes) => {
  const Pwen = sequelize.define("Pwen", {
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stripePaymentId: {
      type: DataTypes.STRING,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }
  }, {
    timestamps: true,
  });

  return Pwen;
};
