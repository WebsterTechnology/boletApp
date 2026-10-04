import { Router } from "express";
import { authenticate, currentUser } from "../middleware/authenticate";
import { sequelize, User, WithdrawalRequest } from "../models";
const router=Router();
router.post("/",authenticate,async(req,res)=>{
 const amount=Number(req.body?.amount);
 if(!Number.isSafeInteger(amount)||amount<30)return res.status(400).json({message:"Retrait minimum: 30 pwen"});
 try{
  const balance=await sequelize.transaction(async t=>{
   const user=await User.findByPk(currentUser(req).id,{transaction:t,lock:t.LOCK.UPDATE});
   if(!user) throw new Error("USER_NOT_FOUND");
   const available=Number(user.withdrawablePoints||0);
   if(amount>available) throw new Error("INSUFFICIENT_WITHDRAW_BALANCE");
   user.withdrawablePoints=available-amount; await user.save({transaction:t});
   await WithdrawalRequest.create({userId:user.id,amount,status:"pending"},{transaction:t});
   return user.withdrawablePoints;
  });
  return res.json({message:"Withdrawal accepted",withdrawablePoints:balance});
 }catch(err){const m=(err as Error).message;if(m==="INSUFFICIENT_WITHDRAW_BALANCE")return res.status(400).json({message:"Montant supérieur au solde disponible pour retirer"});if(m==="USER_NOT_FOUND")return res.status(404).json({message:"User not found"});return res.status(500).json({message:"Server error"});}
});
export default router;
