import { Router } from "express";
import { QueryTypes } from "sequelize";
import { sequelize } from "../models";
import { checkBorrowPixWithProvider, verifiedBorrowPixPayment } from "../services/borrowPixVerification";
import { settleVerifiedBorrowPix } from "../services/borrowPixSettlement";

const router=Router();

/** Unsigned callback is only a signal to query the provider; never payment proof. */
router.post("/webhook",async(req,res)=>{
  if(process.env.BORROW_PIX_WEBHOOK_ENABLED!=="true" ||
     process.env.BORROW_PIX_SETTLEMENT_READY!=="true")
    return res.status(503).json({success:false,message:"Loan PIX settlement disabled"});
  const {order_nsu:orderNsu,transaction_nsu:transactionNsu,invoice_slug:slug}=req.body??{};
  const valid=(value:unknown)=>typeof value==="string" &&
    value.length>=1 && value.length<=128 && /^[A-Za-z0-9_.-]+$/.test(value);
  if(!valid(orderNsu)||!valid(transactionNsu)||!valid(slug))
    return res.status(400).json({success:false,message:"Invalid loan PIX callback"});
  if(!process.env.INFINITEPAY_HANDLE)
    return res.status(503).json({success:false,message:"Provider unavailable"});
  try {
    const rows=await sequelize.query<{id:number;amountCents:number;status:string}>(
      'SELECT id,"amountCents",status FROM borrow_pix_attempts WHERE "providerReference"=:orderNsu',
      {replacements:{orderNsu},type:QueryTypes.SELECT});
    if(rows.length!==1)
      return res.status(404).json({success:false,message:"Unknown loan PIX order"});
    if(!Number.isSafeInteger(Number(rows[0].amountCents)) ||
       Number(rows[0].amountCents)<100)
      return res.status(409).json({success:false,message:"Invalid expected loan payment"});
    const verification=await checkBorrowPixWithProvider({
      handle:process.env.INFINITEPAY_HANDLE,orderNsu,transactionNsu,slug,
      apiKey:process.env.INFINITEPAY_API_KEY
    });
    if(!verifiedBorrowPixPayment(verification,Number(rows[0].amountCents)))
      return res.status(409).json({success:false,message:"Payment not verified"});
    const result=await settleVerifiedBorrowPix(rows[0].id);
    return res.json({success:true,...result});
  }catch(error){
    console.error("loan PIX callback verification failed",error instanceof Error?error.name:"unknown");
    return res.status(503).json({success:false,message:"Payment verification pending"});
  }
});

export default router;
