import { DataTypes } from "sequelize";
import { columnsOf, type Migration } from "./types";
const migration: Migration = {
 async up({context:qi}) {
  if(await columnsOf(qi,"sol_withdrawal_requests"))return;
  await qi.createTable("sol_withdrawal_requests",{
   id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true,allowNull:false},
   packageId:{type:DataTypes.INTEGER,allowNull:false,unique:true,references:{model:"sol_packages",key:"id"},onDelete:"RESTRICT"},
   userId:{type:DataTypes.INTEGER,allowNull:false,references:{model:"users",key:"id"},onDelete:"RESTRICT"},
   grossCents:{type:DataTypes.INTEGER,allowNull:false},
   penaltyCents:{type:DataTypes.INTEGER,allowNull:false},
   netCents:{type:DataTypes.INTEGER,allowNull:false},
   status:{type:DataTypes.STRING(24),allowNull:false,defaultValue:"pending"},
   archivedAt:{type:DataTypes.DATE,allowNull:true},
   paidAt:{type:DataTypes.DATE,allowNull:true},
   createdAt:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW}
  });
  await qi.addIndex("sol_withdrawal_requests",["userId","createdAt"]);
 },
 async down({context:qi}) {if(await columnsOf(qi,"sol_withdrawal_requests"))await qi.dropTable("sol_withdrawal_requests");}
};
export default migration;
