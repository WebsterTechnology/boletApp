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

    const playBalance = Number(user.points || 0);
    const withdrawBalance = Number(user.withdrawablePoints || 0);
    const totalBetBalance = playBalance + withdrawBalance;

    if (totalBetBalance < betPwen) {
      throw new InsufficientPointsError(betPwen, totalBetBalance);
    }

    if (validateInsideTransaction) {
      await validateInsideTransaction(transaction);
    }

    // Bets spend play-only points first. If the bet is larger than the
    // play balance, the remainder is taken from withdrawable points.
    const fromPlay = Math.min(playBalance, betPwen);
    const fromWithdraw = betPwen - fromPlay;

    user.points = playBalance - fromPlay;
    user.withdrawablePoints = withdrawBalance - fromWithdraw;
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
