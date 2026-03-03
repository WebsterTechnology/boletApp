
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      phone: { type: DataTypes.STRING, unique: true, allowNull: false },
      password: { type: DataTypes.STRING, allowNull: false },
      points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // Asaas integration
      asaasCustomerId: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: "users", timestamps: false }
  );

  User.beforeCreate(async (user) => {
    if (user.password.length === 60 && user.password.startsWith("$2b$")) return;
    const raw = user.password.toString().trim();
    if (!/^\d{4}$/.test(raw)) throw new Error("Password must be exactly 4 digits");
    user.password = await bcrypt.hash(raw, 10);
  });

  return User;
};
