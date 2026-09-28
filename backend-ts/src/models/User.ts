import bcrypt from "bcryptjs";
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare phone: string;
  declare fullName: CreationOptional<string | null>;
  declare cpf: CreationOptional<string | null>;
  declare birthDate: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare address: CreationOptional<string | null>;
  declare city: CreationOptional<string | null>;
  declare state: CreationOptional<string | null>;
  declare cep: CreationOptional<string | null>;
  declare profileOnboardingDone: CreationOptional<boolean>;
  declare password: string;
  declare points: CreationOptional<number>;
  declare isAdmin: CreationOptional<boolean>;
  declare asaasCustomerId: CreationOptional<string | null>;
  /** Not a real column; kept because the auth middleware checks it. */
  declare deleted?: boolean;
}

export function initUser(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
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
      password: { type: DataTypes.STRING, allowNull: false },
      points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // Asaas integration
      asaasCustomerId: { type: DataTypes.STRING, allowNull: true },
    },
    { sequelize, modelName: "User", tableName: "users", timestamps: false }
  );

  User.beforeCreate(async (user) => {
    if (user.password.length === 60 && user.password.startsWith("$2b$")) return;
    const raw = user.password.toString().trim();
    if (!/^\d{4}$/.test(raw)) throw new Error("Password must be exactly 4 digits");
    user.password = await bcrypt.hash(raw, 10);
  });

  return User;
}
