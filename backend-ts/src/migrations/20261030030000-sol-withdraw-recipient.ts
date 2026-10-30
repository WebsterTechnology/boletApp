import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";
const migration: Migration = {
 async up({context:qi}) {
  const cols=await columnsOf(qi,"sol_withdrawal_requests");
  if(!cols)throw new Error("Sòl withdrawal request table missing");
  if(!cols.has("recipientName"))await qi.addColumn("sol_withdrawal_requests","recipientName",{type:DataTypes.STRING(160),allowNull:true});
  if(!cols.has("pixKey"))await qi.addColumn("sol_withdrawal_requests","pixKey",{type:DataTypes.STRING(255),allowNull:true});
 },
 async down({context:qi}) {
  const cols=await columnsOf(qi,"sol_withdrawal_requests");
  if(cols?.has("pixKey"))await qi.removeColumn("sol_withdrawal_requests","pixKey");
  if(cols?.has("recipientName"))await qi.removeColumn("sol_withdrawal_requests","recipientName");
 }
};
export default migration;
