import React, { createContext, useContext, useState } from "react";

const BetContext = createContext(null);

export function BetProvider({ children }) {
  const [bets, setBets] = useState([]);

  const addBet = (bet) => {
    setBets((prev) => [...prev, { ...bet, id: Date.now() }]);
  };

  const deleteBet = (id) => {
    setBets((prev) => prev.filter((b) => b.id !== id));
  };

  const editBet = (id, updatedData) => {
    setBets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updatedData } : b)));
  };

  const clearBets = (ids) => {
    setBets((prev) => prev.filter((b) => !ids.includes(b.id)));
  };

  const total = bets.reduce((sum, b) => sum + parseInt(b.amount || 0, 10), 0);

  return (
    <BetContext.Provider value={{ bets, addBet, deleteBet, editBet, clearBets, total }}>
      {children}
    </BetContext.Provider>
  );
}

export const useBet = () => useContext(BetContext);
