import React, { createContext, useContext, useState } from "react";

const BetContext = createContext();

export const BetProvider = ({ children }) => {
  const [bets, setBets] = useState([]);

  // Add a new bet
  const addBet = (bet) => {
    setBets((prev) => [...prev, { ...bet, id: Date.now() }]);
  };

  // Delete a bet by ID
  const deleteBet = (id) => {
    setBets((prev) => prev.filter((b) => b.id !== id));
  };

  // Edit/update bet by ID with new data (e.g., location change)
  const editBet = (id, updatedData) => {
    setBets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updatedData } : b))
    );
  };

  // Total amount of all bets
  const total = bets.reduce((sum, b) => sum + parseInt(b.amount || 0, 10), 0);

  return (
    <BetContext.Provider value={{ bets, addBet, deleteBet, editBet, total }}>
      {children}
    </BetContext.Provider>
  );
};

export const useBet = () => useContext(BetContext);
