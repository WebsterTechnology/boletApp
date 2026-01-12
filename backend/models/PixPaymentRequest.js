// // models/PixPaymentRequest.js
// module.exports = (sequelize, DataTypes) => {
//   const PixPaymentRequest = sequelize.define("PixPaymentRequest", {
//     phoneNumber: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     amount: {
//       type: DataTypes.FLOAT,
//       allowNull: false,
//     },
//     isPaid: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     }
//   });

//   return PixPaymentRequest;
// };
module.exports = (sequelize, DataTypes) => {
  const PixPaymentRequest = sequelize.define("PixPaymentRequest", {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  return PixPaymentRequest;
};
