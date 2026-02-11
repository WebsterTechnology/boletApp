
// import React, { useEffect, useMemo, useState } from "react";
// import { Link } from "react-router-dom";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// export default function AdminDashboard() {
//   const [users, setUsers] = useState([]);
//   const [paidPayments, setPaidPayments] = useState([]);
//   const [amounts, setAmounts] = useState({});
//   const [loading, setLoading] = useState(false);

//   const [disabledNumbers, setDisabledNumbers] = useState([]);
//   const [disabledLocations, setDisabledLocations] = useState([]);
//   const [inputNumbers, setInputNumbers] = useState("");
//   const [selectedLocation, setSelectedLocation] = useState("");

//   const token = localStorage.getItem("token") || "";
//   const auth = useMemo(
//     () => ({ headers: { Authorization: `Bearer ${token}` } }),
//     [token]
//   );

//   /* ---------------- Fetching Data ---------------- */
//   const fetchUsers = async () => {
//     const res = await axios.get(`${API}/api/admin/users`, auth);
//     setUsers(res.data);
//   };

//  const fetchPaidPayments = async () => {
//   const res = await axios.get(
//     `${API}/api/admin/payments`,
//     auth
//   );
//   setPaidPayments(res.data);
// };


//   const fetchDisabledNumbers = async () => {
//     const res = await axios.get(`${API}/api/admin/disabled-numbers`, auth);
//     setDisabledNumbers(res.data);
//   };

//   const fetchDisabledLocations = async () => {
//     const res = await axios.get(`${API}/api/admin/disabled-locations`, auth);
//     setDisabledLocations(res.data);
//   };

//   const refreshAll = async () => {
//     setLoading(true);
//     await Promise.all([
//       fetchUsers(),
//       fetchPaidPayments(),
//       fetchDisabledNumbers(),
//       fetchDisabledLocations(),
//     ]);
//     setLoading(false);
//   };

//   useEffect(() => {
//     refreshAll().catch(console.error);
//   }, [token]);

//   /* ✅ ADD POINTS */
//   const handleAddPwen = async (userId) => {
//     const amount = parseInt(amounts[userId], 10);
//     if (!amount) return alert("Enter a valid number");

//     try {
//       const res = await axios.post(
//         `${API}/api/admin/users/${userId}/add-pwen`,
//         { amount },
//         auth
//       );
//       alert(res.data.message);
//       refreshAll();
//       setAmounts((s) => ({ ...s, [userId]: "" }));
//     } catch (err) {
//       alert(err.response?.data?.message || "Failed to add points");
//     }
//   };

//   /* ✅ ✅ ✅ REMOVE POINTS */
//   const handleRemovePwen = async (userId) => {
//     const amount = parseInt(amounts[userId], 10);
//     if (!amount) return alert("Enter a valid number");

//     try {
//       const res = await axios.post(
//         `${API}/api/admin/users/${userId}/remove-pwen`,
//         { amount },
//         auth
//       );
//       alert(res.data.message);
//       refreshAll();
//       setAmounts((s) => ({ ...s, [userId]: "" }));
//     } catch (err) {
//       alert(err.response?.data?.message || "Failed to remove points");
//     }
//   };

//   /* ✅ Group payments */
//   const grouped = useMemo(
//     () =>
//       paidPayments.reduce((acc, p) => {
//         (acc[p.userId] ||= []).push(p);
//         return acc;
//       }, {}),
//     [paidPayments]
//   );

//   /* ✅ Credit Pix */
//   const creditPayment = async (paymentId) => {
//     const res = await axios.post(
//       `${API}/api/admin/payments/${paymentId}/credit`,
//       {},
//       auth
//     );
//     alert(res.data.message);
//     refreshAll();
//   };

//   /* ✅ Disable Numbers */
//   const saveDisabledNumbers = async () => {
//     const merged = Array.from(
//       new Set([...disabledNumbers, ...inputNumbers.split(",").map(n => n.trim()).filter(Boolean)])
//     );

//     const res = await axios.post(
//       `${API}/api/admin/disabled-numbers`,
//       { numbers: merged },
//       auth
//     );

//     setDisabledNumbers(res.data.disabledNumbers);
//     setInputNumbers("");
//   };

//   const enableNumber = async (num) => {
//     const updated = disabledNumbers.filter((n) => n !== num);
//     setDisabledNumbers(updated);
//     await axios.post(`${API}/api/admin/disabled-numbers`, { numbers: updated }, auth);
//   };

//   /* ✅ Disable Locations */
//   const addDisabledLocation = async () => {
//     const merged = Array.from(new Set([...disabledLocations, selectedLocation]));

//     const res = await axios.post(
//       `${API}/api/admin/disabled-locations`,
//       { locations: merged },
//       auth
//     );

//     setDisabledLocations(res.data.disabledLocations);
//   };

//   const enableLocation = async (loc) => {
//     const updated = disabledLocations.filter((l) => l !== loc);
//     setDisabledLocations(updated);
//     await axios.post(`${API}/api/admin/disabled-locations`, { locations: updated }, auth);
//   };

//   /* ✅ UI */
//   return (
//     <div style={{ padding: "2rem" }}>
//       <h2>👑 Admin Dashboard</h2>

//       <table border="1" width="100%" style={{ marginTop: 12 }}>
//         <thead>
//           <tr>
//             <th>ID</th>
//             <th>Phone</th>
//             <th>Points</th>
//             <th>Pending PIX</th>
//             <th>Amount</th>
//             <th>Actions</th>
//           </tr>
//         </thead>

//         <tbody>
//           {users.map((u) => {
//             const pending = grouped[u.id] || [];

//             return (
//               <tr key={u.id}>
//                 <td>{u.id}</td>
//                 <td>{u.phone}</td>
//                 <td>{u.points}</td>

//                 <td>
//                   {pending.map((p) => (
//                     <button
//                       key={p.id}
//                       onClick={() => creditPayment(p.id)}
//                       style={{ margin: 2 }}
//                     >
//                       +{p.points} Credit
//                     </button>
//                   ))}
//                 </td>

//                 <td>
//                   <input
//                     type="number"
//                     value={amounts[u.id] || ""}
//                     onChange={(e) =>
//                       setAmounts((s) => ({ ...s, [u.id]: e.target.value }))
//                     }
//                     style={{ width: 80 }}
//                   />
//                 </td>

//                 <td style={{ display: "flex", gap: 6 }}>
//                   <button onClick={() => handleAddPwen(u.id)}>➕ Add</button>
//                   <button
//                     onClick={() => handleRemovePwen(u.id)}
//                     style={{ background: "#dc2626", color: "#fff" }}
//                   >
//                     ➖ Remove
//                   </button>
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>

//       <hr />

//       <h3>🚫 Disable Numbers</h3>
//       <input
//         value={inputNumbers}
//         onChange={(e) => setInputNumbers(e.target.value)}
//         placeholder="2,5,10"
//       />
//       <button onClick={saveDisabledNumbers}>Save</button>

//       {disabledNumbers.map((n) => (
//         <button key={n} onClick={() => enableNumber(n)}>
//           ❌ {n}
//         </button>
//       ))}

//       <hr />

//       <h3>🌎 Disable Locations</h3>
//       <select onChange={(e) => setSelectedLocation(e.target.value)}>
//         <option value="">Select</option>
//         <option value="New York">New York</option>
//         <option value="Florida">Florida</option>
//       </select>

//       <button onClick={addDisabledLocation}>Save</button>

//       {disabledLocations.map((l) => (
//         <button key={l} onClick={() => enableLocation(l)}>
//           ❌ {l}
//         </button>
//       ))}
//     </div>
//   );
// }
// import React, { useEffect, useMemo, useState } from "react";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// export default function AdminDashboard() {
//   const [users, setUsers] = useState([]);
//   const [paidPayments, setPaidPayments] = useState([]); // keep name as you want
//   const [amounts, setAmounts] = useState({});
//   const [loading, setLoading] = useState(false);

//   const token = localStorage.getItem("token") || "";
//   const auth = useMemo(
//     () => ({ headers: { Authorization: `Bearer ${token}` } }),
//     [token]
//   );

//   /* ================= FETCH DATA ================= */

//   const fetchUsers = async () => {
//     const res = await axios.get(`${API}/api/admin/users`, auth);
//     setUsers(res.data);
//   };

//   // 🔥 ONLY PAID PIX → shown in Pending PIX column
//   const fetchPaidPayments = async () => {
//     const res = await axios.get(
//       `${API}/api/admin/payments?status=credited`, // 🔴 IMPORTANT
//       auth
//     );
//     setPaidPayments(res.data);
//   };

//   const refreshAll = async () => {
//     setLoading(true);
//     await Promise.all([fetchUsers(), fetchPaidPayments()]);
//     setLoading(false);
//   };

//   useEffect(() => {
//     refreshAll().catch(console.error);
//   }, [token]);

//   /* ================= POINTS ================= */

//   const handleAddPwen = async (userId) => {
//     const amount = parseInt(amounts[userId], 10);
//     if (!amount) return alert("Enter amount");

//     await axios.post(
//       `${API}/api/admin/users/${userId}/add-pwen`,
//       { amount },
//       auth
//     );

//     refreshAll();
//     setAmounts((s) => ({ ...s, [userId]: "" }));
//   };

//   const handleRemovePwen = async (userId) => {
//     const amount = parseInt(amounts[userId], 10);
//     if (!amount) return alert("Enter amount");

//     await axios.post(
//       `${API}/api/admin/users/${userId}/remove-pwen`,
//       { amount },
//       auth
//     );

//     refreshAll();
//     setAmounts((s) => ({ ...s, [userId]: "" }));
//   };

//   /* ================= PIX ================= */

//   // group PAID pix by user
//   const grouped = useMemo(() => {
//     return paidPayments.reduce((acc, p) => {
//       (acc[p.userId] ||= []).push(p);
//       return acc;
//     }, {});
//   }, [paidPayments]);

//   // credit pix → adds points + removes from pending
//   const creditPayment = async (paymentId) => {
//     await axios.post(
//       `${API}/api/admin/payments/${paymentId}/credit`,
//       {},
//       auth
//     );
//     refreshAll(); // PIX disappears after this
//   };

//   /* ================= UI ================= */

//   return (
//     <div style={{ padding: 24 }}>
//       <h2>👑 Admin Dashboard</h2>

//       <table border="1" width="100%">
//         <thead>
//           <tr>
//             <th>ID</th>
//             <th>Phone</th>
//             <th>Points</th>
//             <th>PIX Receive (PAID)</th>
//             <th>Amount</th>
//             <th>Actions</th>
//           </tr>
//         </thead>

//         <tbody>
//           {users.map((u) => {
//             const pendingPix = grouped[u.id] || [];

//             return (
//               <tr key={u.id}>
//                 <td>{u.id}</td>
//                 <td>{u.phone}</td>
//                 <td>{u.points}</td>

//                 {/* 🔥 ONLY PAID PIX SHOWS HERE */}
//                 <td>
//                   {pendingPix.map((p) => (
//                     <button
//                       key={p.id}
//                       onClick={() => creditPayment(p.id)}
//                       style={{ margin: 4 }}
//                     >
//                       +{p.points} PIX
//                     </button>
//                   ))}
//                 </td>

//                 <td>
//                   <input
//                     type="number"
//                     value={amounts[u.id] || ""}
//                     onChange={(e) =>
//                       setAmounts((s) => ({
//                         ...s,
//                         [u.id]: e.target.value,
//                       }))
//                     }
//                     style={{ width: 80 }}
//                   />
//                 </td>

//                 <td>
//                   <button onClick={() => handleAddPwen(u.id)}>➕ Add</button>
//                   <button
//                     onClick={() => handleRemovePwen(u.id)}
//                     style={{ marginLeft: 6, background: "red", color: "#fff" }}
//                   >
//                     ➖ Remove
//                   </button>
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>

//       {loading && <p>Loading…</p>}
//     </div>
//   );
// }

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token") || "";
  const auth = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  /* ================= FETCH USERS ================= */

  const fetchUsers = async () => {
    const res = await axios.get(`${API}/api/admin/users`, auth);
    setUsers(res.data);
  };

  const refreshAll = async () => {
    setLoading(true);
    await fetchUsers();
    setLoading(false);
  };

  useEffect(() => {
    refreshAll().catch(console.error);
  }, [token]);

  /* ================= POINTS ================= */

  const handleAddPwen = async (userId) => {
    const amount = parseInt(amounts[userId], 10);
    if (!amount) return alert("Enter amount");

    await axios.post(
      `${API}/api/admin/users/${userId}/add-pwen`,
      { amount },
      auth
    );

    refreshAll();
    setAmounts((s) => ({ ...s, [userId]: "" }));
  };

  const handleRemovePwen = async (userId) => {
    const amount = parseInt(amounts[userId], 10);
    if (!amount) return alert("Enter amount");

    await axios.post(
      `${API}/api/admin/users/${userId}/remove-pwen`,
      { amount },
      auth
    );

    refreshAll();
    setAmounts((s) => ({ ...s, [userId]: "" }));
  };

  /* ================= UI ================= */

  return (
    <div style={{ padding: 24 }}>
      <h2>👑 Admin Dashboard</h2>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>Phone</th>
            <th>Points</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.phone}</td>
              <td>{u.points}</td>

              <td>
                <input
                  type="number"
                  value={amounts[u.id] || ""}
                  onChange={(e) =>
                    setAmounts((s) => ({
                      ...s,
                      [u.id]: e.target.value,
                    }))
                  }
                  style={{ width: 80 }}
                />
              </td>

              <td>
                <button onClick={() => handleAddPwen(u.id)}>➕ Add</button>
                <button
                  onClick={() => handleRemovePwen(u.id)}
                  style={{ marginLeft: 6, background: "red", color: "#fff" }}
                >
                  ➖ Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {loading && <p>Loading…</p>}
    </div>
  );
}
