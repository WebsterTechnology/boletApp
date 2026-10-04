import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize";
import type { User } from "./User";
export class WithdrawalRequest extends Model<InferAttributes<WithdrawalRequest>,InferCreationAttributes<WithdrawalRequest>> {
 declare id:CreationOptional<number>; declare userId:ForeignKey<User["id"]>; declare amount:number; declare status:CreationOptional<string>; declare createdAt:CreationOptional<Date>; declare updatedAt:CreationOptional<Date>;
}
export function initWithdrawalRequest(sequelize:Sequelize){WithdrawalRequest.init({id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true},userId:{type:DataTypes.INTEGER,allowNull:false},amount:{type:DataTypes.INTEGER,allowNull:false},status:{type:DataTypes.STRING,allowNull:false,defaultValue:"pending"},createdAt:DataTypes.DATE,updatedAt:DataTypes.DATE},{sequelize,modelName:"WithdrawalRequest",tableName:"withdrawal_requests",timestamps:true});}
