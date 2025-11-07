// BetList.js
import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useBet } from "../context/BetContext";
import styles from "../style/BetForm.module.css";

const BetList = () => {
  const { bets, deleteBet, total } = useBet();

  return (
    <div>
      <ul className={styles.betsList}>
        {bets.map((b) => (
          <li key={b.id}>
            <span className={styles.num}>{b.number || b.numbers}</span>
            <span className={styles.amt}>{b.amount} p</span>
            <div className={styles.actions}>
              <button onClick={() => {/* optional edit */}}><FaEdit /></button>
              <button onClick={() => deleteBet(b.id)}><FaTrash /></button>
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.footer}>
       
      </div>
    </div>
  );
};

export default BetList;
