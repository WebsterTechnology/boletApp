import type { Model, ModelStatic, Transaction } from "sequelize";
import { sequelize, User } from "../models";

export class InsufficientPointsError extends Error {
  constructor(public required: number, public currentBalance: number) {
    super("INSUFFICIENT_POINTS");
    this.name = "InsufficientPointsError";
  }
}

type BetModel = ModelStatic<Model>;

export async function createBetWithPoints<T extends Record<string, unknown>>(
  userId: number,
  betPwen: number,
  Bet: BetModel,
  data: T,
  validateInsideTransaction?: (transaction: Transaction) => Promise<void>
) {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) throw new Error("USER_NOT_FOUND");

    if (user.points < betPwen) {
      throw new InsufficientPointsError(betPwen, user.points);
    }

    if (validateInsideTransaction) {
      await validateInsideTransaction(transaction);
    }

    user.points -= betPwen;
    await user.save({ transaction });

    const bet = await Bet.create(
      { ...data, pwen: betPwen, userId } as any,
      { transaction }
    );

    return { user, bet };
  });
}

/** Serialize capacity checks for the same game/number/location across different users. PostgreSQL only. */
export async function lockBetLimit(transaction: Transaction, key: string) {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", {
    replacements: { key },
    transaction,
  });
}
