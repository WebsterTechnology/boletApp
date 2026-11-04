import { QueryTypes } from "sequelize";
import { BorrowRequest, User, sequelize } from "../models";
import { loanTotal, repaymentLedgerReconciles } from "./borrowRepayment";

/** Apply only an independently provider-verified loan PIX payment. */
export async function settleVerifiedBorrowPix(attemptId:number) {
  if (!Number.isSafeInteger(attemptId) || attemptId<1) throw new Error("Invalid attempt");
  return sequelize.transaction(async transaction=>{
    const initial=await sequelize.query<{borrowRequestId:number;userId:number}>(
      'SELECT "borrowRequestId","userId" FROM borrow_pix_attempts WHERE id=:attemptId',
      {replacements:{attemptId},type:QueryTypes.SELECT,transaction});
    if (!initial.length) throw new Error("Attempt not found");
    const user=await User.findByPk(initial[0].userId,{transaction,lock:transaction.LOCK.UPDATE});
    if (!user) throw new Error("User not found");
    const loan=await BorrowRequest.findByPk(initial[0].borrowRequestId,{transaction,lock:transaction.LOCK.UPDATE});
    if (!loan || loan.userId!==user.id || loan.status!=="approved" || !loan.creditedAt)
      throw new Error("Loan not eligible");
    const rows=await sequelize.query<{id:number;points:number;amountCents:number;status:string;userId:number;borrowRequestId:number}>(
      'SELECT id,points,"amountCents",status,"userId","borrowRequestId" FROM borrow_pix_attempts WHERE id=:attemptId FOR UPDATE',
      {replacements:{attemptId},type:QueryTypes.SELECT,transaction});
    const attempt=rows[0];
    if (!attempt || attempt.userId!==user.id || attempt.borrowRequestId!==loan.id)
      throw new Error("Attempt mismatch");
    const remaining=loanTotal(Number(loan.amount))-Number(loan.repaidPoints);
    if (attempt.status==="confirmed") {
      const existing=await sequelize.query<{amount:number;method:string}>(
        'SELECT amount,method FROM borrow_repayments WHERE "idempotencyKey"=:key',
        {replacements:{key:"borrow-pix-"+attempt.id},type:QueryTypes.SELECT,transaction});
      const ledger=await sequelize.query<{amount:number}>(
        'SELECT amount FROM borrow_repayments WHERE "borrowRequestId"=:id',
        {replacements:{id:loan.id},type:QueryTypes.SELECT,transaction});
      if (existing.length!==1 || existing[0].method!=="pix" ||
          Number(existing[0].amount)!==attempt.points ||
          !repaymentLedgerReconciles(Number(loan.repaidPoints),ledger.map(x=>Number(x.amount))))
        throw new Error("Confirmed PIX repayment reconciliation failed");
      return {duplicate:true,remaining};
    }
    if (!["pending","checkout_created"].includes(attempt.status) ||
        !Number.isSafeInteger(attempt.points) || attempt.points<1 ||
        attempt.points*100!==attempt.amountCents || attempt.points>remaining)
      throw new Error("Attempt not eligible");
    const ledger=await sequelize.query<{amount:number}>(
      'SELECT amount FROM borrow_repayments WHERE "borrowRequestId"=:id',
      {replacements:{id:loan.id},type:QueryTypes.SELECT,transaction});
    if (!repaymentLedgerReconciles(Number(loan.repaidPoints),ledger.map(x=>Number(x.amount))))
      throw new Error("Repayment ledger mismatch");
    await sequelize.query(
      'INSERT INTO borrow_repayments ("borrowRequestId","userId",amount,"playDebited","withdrawDebited",method,"idempotencyKey","createdAt") VALUES (:id,:userId,:points,0,0,\'pix\',:key,NOW())',
      {replacements:{id:loan.id,userId:user.id,points:attempt.points,key:"borrow-pix-"+attempt.id},transaction});
    loan.repaidPoints=Number(loan.repaidPoints)+attempt.points;
    await loan.save({transaction});
    await sequelize.query(
      'UPDATE borrow_pix_attempts SET status=\'confirmed\',"confirmedAt"=NOW(),"updatedAt"=NOW() WHERE id=:attemptId',
      {replacements:{attemptId},transaction});
    return {duplicate:false,remaining:remaining-attempt.points,paid:attempt.points};
  });
}
