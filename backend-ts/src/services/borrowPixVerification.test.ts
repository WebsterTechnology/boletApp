import { describe,expect,it } from "vitest";
import { verifiedBorrowPixPayment } from "./borrowPixVerification";

describe("InfinitePay loan PIX payment verification",()=>{
  const valid={success:true,paid:true,amount:12000,capture_method:"pix"};
  it("accepts exact paid PIX amount in cents",()=>expect(verifiedBorrowPixPayment(valid,12000)).toBe(true));
  it("rejects unpaid, unsuccessful and unsupported payment methods",()=>{
    expect(verifiedBorrowPixPayment({...valid,paid:false},12000)).toBe(false);
    expect(verifiedBorrowPixPayment({...valid,success:false},12000)).toBe(false);
    expect(verifiedBorrowPixPayment({...valid,capture_method:"credit_card"},12000)).toBe(true);
    expect(verifiedBorrowPixPayment({...valid,capture_method:"cash"},12000)).toBe(false);
  });
  it("rejects missing confirmation fields and unsupported payments",()=>{
    expect(verifiedBorrowPixPayment({},12000)).toBe(false);
    expect(verifiedBorrowPixPayment({success:true,paid:true,amount:12000},12000)).toBe(false);
    expect(verifiedBorrowPixPayment({...valid,paid:"true"},12000)).toBe(false);
    expect(verifiedBorrowPixPayment({...valid,success:1},12000)).toBe(false);
    expect(verifiedBorrowPixPayment({...valid,amount:12000.5},12000)).toBe(false);
  });
  it("does not accept a different amount even when the provider reports paid",()=>{
    expect(verifiedBorrowPixPayment({...valid,amount:12001},12000)).toBe(false);
    expect(verifiedBorrowPixPayment({...valid,amount:11999},12000)).toBe(false);
  });
  it("rejects mismatched and invalid monetary values",()=>{
    expect(verifiedBorrowPixPayment({...valid,amount:11900},12000)).toBe(false);
    expect(verifiedBorrowPixPayment({...valid,amount:"12000"},12000)).toBe(false);
    expect(verifiedBorrowPixPayment(valid,0)).toBe(false);
  });
});
