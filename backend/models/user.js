
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      phone: { type: DataTypes.STRING, unique: true, allowNull: false },
      fullName: { type: DataTypes.STRING, allowNull: true },
      cpf: { type: DataTypes.STRING(11), unique: true, allowNull: true },
      birthDate: { type: DataTypes.DATEONLY, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.STRING, allowNull: true },
      city: { type: DataTypes.STRING, allowNull: true },
      state: { type: DataTypes.STRING(2), allowNull: true },
      cep: { type: DataTypes.STRING(8), allowNull: true },
      profileOnboardingDone: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      profileOnboardingDone: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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
