// backend/models/index.js
const Sequelize = require("sequelize");
const sequelize = require("../config/database");
const { DataTypes } = Sequelize;

// Models
const User       = require("./user")(sequelize, DataTypes);
const YonChif    = require("./yonchif")(sequelize, DataTypes);
const Maryaj     = require("./maryaj")(sequelize, DataTypes);
const TwaChif    = require("./twachif")(sequelize, DataTypes);
const Pwen       = require("./pwen")(sequelize, DataTypes);
const PixPayment = require("./PixPayment")(sequelize, DataTypes);
const WinClaim   = require("./winclaim")(sequelize, DataTypes); // <-- add this

// Associations
User.hasMany(YonChif,    { foreignKey: "userId" });
YonChif.belongsTo(User,  { foreignKey: "userId" });

User.hasMany(Maryaj,     { foreignKey: "userId" });
Maryaj.belongsTo(User,   { foreignKey: "userId" });

User.hasMany(TwaChif,    { foreignKey: "userId" });
TwaChif.belongsTo(User,  { foreignKey: "userId" });

User.hasMany(PixPayment, { foreignKey: "userId" });
PixPayment.belongsTo(User, { foreignKey: "userId" });

User.hasMany(WinClaim,   { foreignKey: "userId" });
WinClaim.belongsTo(User, { foreignKey: "userId" });

// If any model defines .associate(models) use it:
const models = {
  User,
  YonChif,
  Maryaj,
  TwaChif,
  Pwen,
  PixPayment,
  WinClaim,
};

Object.values(models).forEach((m) => m.associate && m.associate(models));

module.exports = {
  sequelize,
  Sequelize,
  ...models,
};
