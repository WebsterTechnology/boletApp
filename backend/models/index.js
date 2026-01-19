
const Sequelize = require("sequelize");
const sequelize = require("../config/database");
const { DataTypes } = Sequelize;

// Import ALL models
const User = require("./user")(sequelize, DataTypes);
const YonChif = require("./yonchif")(sequelize, DataTypes);
const Maryaj = require("./maryaj")(sequelize, DataTypes);
const TwaChif = require("./twachif")(sequelize, DataTypes);
const Pwen = require("./pwen")(sequelize, DataTypes);
const PixPayment = require("./PixPayment")(sequelize, DataTypes);
const WinClaim = require("./winclaim")(sequelize, DataTypes);
const PixPaymentRequest = require("./PixPaymentRequest")(sequelize, DataTypes);
const DeChif = require("./dechif")(sequelize, DataTypes);

// ==================== ASSOCIATIONS ====================
// User -> YonChif
User.hasMany(YonChif, { foreignKey: "userId" });
YonChif.belongsTo(User, { foreignKey: "userId" });

// User -> Maryaj
User.hasMany(Maryaj, { foreignKey: "userId" });
Maryaj.belongsTo(User, { foreignKey: "userId" });

// User -> TwaChif
User.hasMany(TwaChif, { foreignKey: "userId" });
TwaChif.belongsTo(User, { foreignKey: "userId" });

// User -> DeChif
User.hasMany(DeChif, { foreignKey: "userId" });
DeChif.belongsTo(User, { foreignKey: "userId" });

// User -> PixPayment (CRITICAL!)
User.hasMany(PixPayment, { 
  foreignKey: "userId",
  as: "pixPayments"
});
PixPayment.belongsTo(User, { 
  foreignKey: "userId",
  as: "user"
});

// User -> PixPaymentRequest
User.hasMany(PixPaymentRequest, { 
  foreignKey: "userId",
  as: "pixPaymentRequests"
});
PixPaymentRequest.belongsTo(User, { 
  foreignKey: "userId",
  as: "user"
});

// User -> WinClaim
User.hasMany(WinClaim, { foreignKey: "userId" });
WinClaim.belongsTo(User, { foreignKey: "userId" });

// User -> Pwen
User.hasMany(Pwen, { foreignKey: "userId", as: "pwenTransactions" });
Pwen.belongsTo(User, { foreignKey: "userId", as: "user" });

// ==================== MODEL OBJECT ====================
const models = {
  User,
  YonChif,
  Maryaj,
  TwaChif,
  Pwen,
  PixPayment,
  WinClaim,
  DeChif,
  PixPaymentRequest,
};

// Call associate method if it exists
Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  Sequelize,
  ...models,
};