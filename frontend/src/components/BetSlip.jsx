
// import React from "react";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { useBet } from "../context/BetContext";
// import styles from "../style/BetForm.module.css";

// export default function BetSlip({
//   onEdit,
//   onSubmit,
//   title = "🧾 Pending Bets",
// }) {
//   const { bets, deleteBet, total } = useBet();

//   return (
//     <div
//       style={{
//         marginTop: 20,
//         background: "#222",
//         borderRadius: 12,
//         padding: 15,
//       }}
//     >
//       <h3
//         style={{
//           textAlign: "center",
//           marginBottom: 15,
//           color: "#ffc107",
//         }}
//       >
//         {title}
//       </h3>

//       {bets.length === 0 ? (
//         <p
//           style={{
//             textAlign: "center",
//             color: "#999",
//           }}
//         >
//           No pending bets
//         </p>
//       ) : (
//         <ul className={styles.betsList}>
//           {bets.map((bet) => (
//             <li key={bet.id}>
//               <div
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   flex: 1,
//                 }}
//               >
//                 <strong
//                   style={{
//                     color: "#ffc107",
//                     fontSize: "15px",
//                   }}
//                 >
//                   {bet.type}
//                 </strong>

//                 <span
//                   style={{
//                     fontSize: "18px",
//                     fontWeight: "bold",
//                   }}
//                 >
//                   {bet.display || bet.number}
//                 </span>

//                 <span
//                   style={{
//                     color: "#ddd",
//                   }}
//                 >
//                   {bet.amount} p
//                 </span>

//                 {bet.location && (
//                   <small
//                     style={{
//                       color: "#999",
//                     }}
//                   >
//                     {bet.location}
//                   </small>
//                 )}
//               </div>

//               <div className={styles.actions}>
//                 <button
//                   onClick={() => onEdit && onEdit(bet)}
//                 >
//                   <FaEdit />
//                 </button>

//                 <button
//                   onClick={() => deleteBet(bet.id)}
//                 >
//                   <FaTrash />
//                 </button>
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}

//       <div
//         style={{
//           marginTop: 15,
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           borderTop: "1px solid #444",
//           paddingTop: 15,
//         }}
//       >
//         <strong
//           style={{
//             fontSize: 20,
//             color: "#ffc107",
//           }}
//         >
//           Total: {total} p
//         </strong>

//         {onSubmit && (
//           <button
//             className={styles.submitBtn}
//             onClick={onSubmit}
//           >
//             Soumèt Pari
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }


import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useBet } from "../context/BetContext";
import styles from "../style/BetForm.module.css";

export default function BetSlip({
  onEdit,
  onSubmit,
  title = "Pending Bets",
}) {
  const { bets, deleteBet, total } = useBet();

  return (
    <div
      style={{
        marginTop: 20,
        background: "#fff",
        color: "#000",
        borderRadius: 8,
        padding: "14px 16px",
        fontFamily: "monospace",
        boxShadow: "0 8px 25px rgba(0,0,0,.35)",
      }}
    >
      <h3
        style={{
          textAlign: "center",
          marginBottom: 8,
          color: "#000",
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        {title}
      </h3>

      <div style={{ borderTop: "2px dashed #000", margin: "8px 0" }} />

      {bets.length === 0 ? (
        <p style={{ textAlign: "center", color: "#555" }}>
          Pa gen pari ankò
        </p>
      ) : (
        <div>
          {bets.map((bet) => (
            <div key={bet.id}>
              <div
                style={{
                  textAlign: "center",
                  margin: "8px 0",
                }}
              >
                <span
                  style={{
                    background: "#102a63",
                    color: "#fff",
                    padding: "3px 12px",
                    borderRadius: 4,
                    fontWeight: "bold",
                  }}
                >
                  {bet.type}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  columnGap: 10,
                  alignItems: "center",
                  lineHeight: "24px",
                  fontSize: 16,
                }}
              >
                <span>{bet.display || bet.number}</span>
                <span>=</span>
                <strong>{bet.amount}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <button onClick={() => onEdit && onEdit(bet)}>
                  <FaEdit />
                </button>

                <button onClick={() => deleteBet(bet.id)}>
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: "2px dashed #000", margin: "10px 0" }} />

      <div
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: 28,
        }}
      >
        *Total {total}*
      </div>

      <div style={{ borderTop: "2px dashed #000", margin: "10px 0" }} />

      {onSubmit && (
        <button
          className={styles.submitBtn}
          onClick={onSubmit}
        >
          Soumèt Pari
        </button>
      )}
    </div>
  );
}
