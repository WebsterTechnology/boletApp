import React, { createContext, useContext, useState, type ReactNode } from "react";
import type { CartBet, NewCartBet } from "../types/bet";

export interface BetContextValue {
  bets: CartBet[];
  addBet: (bet: NewCartBet) => void;
  deleteBet: (id: number) => void;
  editBet: (id: number, updatedData: Partial<CartBet>) => void;
  total: number;
}

const BetContext = createContext<BetContextValue | undefined>(undefined);

export const BetProvider = ({ children }: { children: ReactNode }) => {
  const [bets, setBets] = useState<CartBet[]>([]);

  const addBet = (bet: NewCartBet) => {
    setBets((prev) => [...prev, { ...bet, id: Date.now() }]);
  };

  const deleteBet = (id: number) => {
    setBets((prev) => prev.filter((b) => b.id !== id));
  };

  const editBet = (id: number, updatedData: Partial<CartBet>) => {
    setBets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updatedData } : b))
    );
  };

  const total = bets.reduce((sum, b) => sum + parseInt(String(b.amount || 0), 10), 0);

  return (
    <BetContext.Provider value={{ bets, addBet, deleteBet, editBet, total }}>
      {children}
    </BetContext.Provider>
  );
};

export const useBet = (): BetContextValue => {
  const ctx = useContext(BetContext);
  if (!ctx) throw new Error("useBet must be used inside <BetProvider>");
  return ctx;
};
