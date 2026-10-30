import { Router } from "express";
import { adminOnly } from "../middleware/adminOnly";
import { authenticate, currentUser } from "../middleware/authenticate";
import { sequelize, User, WithdrawalRequest } from "../models";
const router=Router();
router.get("/mine", authenticate, async(req,res)=>{
 try {
  const requests=await WithdrawalRequest.findAll({where:{userId:currentUser(req).id,archivedAt:null},attributes:["id","amount","status","createdAt","updatedAt"],order:[["createdAt","DESC"]],limit:100});
  return res.json(requests);
 } catch {return res.status(500).json({message:"Unable to load withdrawal requests"});}
});
router.get("/admin",authenticate,adminOnly,async(_req,res)=>{
 try {
  const requests=await WithdrawalRequest.findAll({where:{archivedAt:null},include:[{model:User,attributes:["id","fullName","phone"]}],order:[["createdAt","DESC"]],limit:300});
  return res.json(requests.map(r=>({id:r.id,userId:r.userId,amount:r.amount,status:r.status,createdAt:r.createdAt,updatedAt:r.updatedAt,customer:(r as unknown as {User?:{fullName:string|null;phone:string}}).User??null})));
 } catch{return res.status(500).json({message:"Unable to load withdrawal requests"});}
});
router.patch("/admin/:id/paid",authenticate,adminOnly,async(req,res)=>{
 const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({message:"Invalid request"});
 try {
  const result=await sequelize.transaction(async t=>{
   const item=await WithdrawalRequest.findOne({where:{id,archivedAt:null},transaction:t,lock:t.LOCK.UPDATE});
   if(!item)return {code:404};
   if(item.status==="paid")return {code:200};
   if(item.status!=="pending")return {code:409};
   item.status="paid";await item.save({transaction:t});
   return {code:200};
  });
  return res.status(result.code).json({message:result.code===200?"Marked paid":"Cannot mark paid"});
 } catch{return res.status(500).json({message:"Unable to update withdrawal"});}
});
router.delete("/admin/:id",authenticate,adminOnly,async(req,res)=>{
 const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({message:"Invalid request"});
 try {
  const result=await sequelize.transaction(async t=>{
   const item=await WithdrawalRequest.findOne({where:{id,archivedAt:null},transaction:t,lock:t.LOCK.UPDATE});
   if(!item)return 404;
   if(item.status!=="paid")return 409;
   item.archivedAt=new Date();await item.save({transaction:t});return 204;
  });
  return res.status(result).send();
 }catch{return res.status(500).json({message:"Unable to archive withdrawal"});}
});

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
