// // // models/PixPayment.js
// // module.exports = (sequelize, DataTypes) => {
// //   const PixPayment = sequelize.define(
// //     "PixPayment",
// //     {
// //       userId: {
// //         type: DataTypes.INTEGER,
// //         allowNull: false,
// //       },
// //       providerRef: {
// //         // unique reference/id from the PIX provider (or your own id)
// //         type: DataTypes.STRING,
// //         allowNull: false,
// //         unique: true,
// //       },
// //       amountBRL: {
// //         type: DataTypes.DECIMAL(10, 2),
// //         allowNull: false,
// //       },
// //       points: {
// //         // points that this payment should credit (e.g. 1 BRL => 1 point)
// //         type: DataTypes.INTEGER,
// //         allowNull: false,
// //       },
// //       status: {
// //         // created/pending/paid/credited/failed/expired
// //         type: DataTypes.ENUM("created", "pending", "paid", "credited", "failed", "expired"),
// //         defaultValue: "pending",
// //       },
// //       expiresAt: {
// //         type: DataTypes.DATE,
// //         allowNull: true,
// //       },
// //       rawPayload: {
// //         // store provider payload for audits (optional)
// //         type: DataTypes.JSON,
// //         allowNull: true,
// //       },
// //     },
// //     {
// //       tableName: "pix_payments",
// //       timestamps: true,
// //     }
// //   );

// //   return PixPayment;
// // };
// // models/PixPayment.js
// module.exports = (sequelize, DataTypes) => {
//   const PixPayment = sequelize.define(
//     "PixPayment",
//     {
//       userId: { type: DataTypes.INTEGER, allowNull: false },
//       providerRef: { type: DataTypes.STRING, allowNull: false, unique: true }, // Asaas payment id
//       amountBRL: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
//       points: { type: DataTypes.INTEGER, allowNull: false }, // e.g., 1 BRL -> 1 point
//       status: {
//         type: DataTypes.ENUM("created", "pending", "paid", "credited", "failed", "expired"),
//         defaultValue: "pending",
//       },
//       expiresAt: { type: DataTypes.DATE, allowNull: true },
//       rawPayload: { type: DataTypes.JSON, allowNull: true },
//     },
//     { tableName: "pix_payments", timestamps: true }
//   );

//   return PixPayment;
// };

// models/PixPayment.js
module.exports = (sequelize, DataTypes) => {
  const PixPayment = sequelize.define(
    "PixPayment",
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },

      // Asaas payment id
      providerRef: { type: DataTypes.STRING, allowNull: false, unique: true },

      // Gross amount you charged (what the payer sent)
      amountBRL: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

      // Net amount Asaas credited to you (gross - fees). Filled by webhook.
      netValueBRL: { type: DataTypes.DECIMAL(10, 2), allowNull: true },

      // Computed as gross - net when webhook arrives
      feeBRL: { type: DataTypes.DECIMAL(10, 2), allowNull: true },

      // Your own points logic (e.g., 1 BRL -> 1 point)
      points: { type: DataTypes.INTEGER, allowNull: false },

      // lifecycle
      status: {
        type: DataTypes.ENUM("created", "pending", "paid", "credited", "failed", "expired"),
        defaultValue: "pending",
      },

      expiresAt: { type: DataTypes.DATE, allowNull: true },

      // Keep provider payload for audits/debug
      rawPayload: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: "pix_payments", timestamps: true }
  );

  return PixPayment;
};
