
// import React, { useEffect, useMemo, useState } from "react";
// import { Link } from "react-router-dom";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// export default function AdminDashboard() {
//   const [users, setUsers] = useState([]);
//   const [paidPayments, setPaidPayments] = useState([]); // list of paid (not yet credited)
//   const [amounts, setAmounts] = useState({});
//   const [loading, setLoading] = useState(false);

//   // 🆕 for disabling/enabling numbers
//   const [disabledNumbers, setDisabledNumbers] = useState([]);
//   const [inputValue, setInputValue] = useState("");

//   const token = localStorage.getItem("token") || "";
//   const auth = useMemo(
//     () => ({ headers: { Authorization: `Bearer ${token}` } }),
//     [token]
//   );

//   const fetchUsers = async () => {
//     const res = await axios.get(`${API}/api/admin/users`, auth);
//     setUsers(res.data);
//   };

//   const fetchPaidPayments = async () => {
//     const res = await axios.get(`${API}/api/admin/payments?status=paid`, auth);
//     setPaidPayments(res.data);
//   };

//   const fetchDisabledNumbers = async () => {
//     try {
//       const res = await axios.get(`${API}/api/admin/disabled-numbers`, auth);
//       setDisabledNumbers(res.data);
//     } catch (e) {
//       console.error("Failed to load disabled numbers", e);
//     }
//   };

//   const refreshAll = async () => {
//     setLoading(true);
//     try {
//       await Promise.all([fetchUsers(), fetchPaidPayments(), fetchDisabledNumbers()]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     refreshAll().catch(console.error);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [token]);

//   const handleAddPwen = async (userId) => {
//     const amount = parseInt(amounts[userId], 10);
//     if (!amount || Number.isNaN(amount)) return alert("Enter a valid number");

//     try {
//       const res = await axios.post(
//         `${API}/api/admin/users/${userId}/add-pwen`,
//         { amount },
//         auth
//       );
//       alert(res.data.message);
//       await fetchUsers();
//       setAmounts((s) => ({ ...s, [userId]: "" }));
//     } catch (err) {
//       alert(err.response?.data?.message || "Failed to add pwen");
//     }
//   };

//   // map userId -> array of payments
//   const grouped = useMemo(
//     () =>
//       paidPayments.reduce((acc, p) => {
//         (acc[p.userId] ||= []).push(p);
//         return acc;
//       }, {}),
//     [paidPayments]
//   );

//   const creditPayment = async (paymentId) => {
//     try {
//       const res = await axios.post(
//         `${API}/api/admin/payments/${paymentId}/credit`,
//         {},
//         auth
//       );
//       alert(res.data.message || "Credited");
//       await refreshAll();
//     } catch (e) {
//       alert(e.response?.data?.message || "Failed to credit payment");
//     }
//   };

//   // 🆕 Save updated disabled numbers list (add multiple)
//   const saveDisabledNumbers = async () => {
//     try {
//       const newNumbers = inputValue
//         .split(",")
//         .map((n) => n.trim())
//         .filter(Boolean);

//       if (newNumbers.length === 0) return alert("Enter at least one number");

//       // Merge with existing numbers and remove duplicates
//       const merged = Array.from(new Set([...disabledNumbers, ...newNumbers]));

//       const res = await axios.post(
//         `${API}/api/admin/disabled-numbers`,
//         { numbers: merged },
//         auth
//       );

//       alert(res.data.message || "Disabled numbers updated");
//       setDisabledNumbers(res.data.disabledNumbers || merged);
//       setInputValue("");
//     } catch (e) {
//       alert(e.response?.data?.message || "Failed to update disabled numbers");
//     }
//   };

//   // 🆕 Remove (enable back) a specific number
//   const enableNumber = async (num) => {
//     const updated = disabledNumbers.filter((n) => n !== num);
//     setDisabledNumbers(updated);
//     try {
//       await axios.post(`${API}/api/admin/disabled-numbers`, { numbers: updated }, auth);
//     } catch (e) {
//       alert("Failed to enable number back");
//     }
//   };

//   return (
//     <div style={{ padding: "2rem" }}>
//       {/* Header with Manage Bets + Refresh */}
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           gap: 12,
//         }}
//       >
//         <h2>👑 Admin Dashboard — Manage Users</h2>
//         <div style={{ display: "flex", gap: 8 }}>
//           <Link to="/admin/bets">
//             <button type="button">Manage Bets</button>
//           </Link>
//           <button type="button" onClick={refreshAll} disabled={loading}>
//             {loading ? "Refreshing..." : "Refresh"}
//           </button>
//         </div>
//       </div>

//       <p style={{ opacity: 0.6 }}>
//         API: {API} · Admin:{" "}
//         {String(JSON.parse(localStorage.getItem("isAdmin") || "false"))}
//       </p>

//       {/* Users Table */}
//       {users.length === 0 ? (
//         <p>{loading ? "Loading users..." : "No users found."}</p>
//       ) : (
//         <table
//           border="1"
//           cellPadding="8"
//           style={{
//             width: "100%",
//             marginTop: "1rem",
//             borderCollapse: "collapse",
//           }}
//         >
//           <thead style={{ background: "#111", color: "#fff" }}>
//             <tr>
//               <th>ID</th>
//               <th>Phone</th>
//               <th>Points</th>
//               <th>Paid PIX (pending)</th>
//               <th>Add Pwen</th>
//               <th>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {users.map((u) => {
//               const pending = grouped[u.id] || [];
//               return (
//                 <tr key={u.id}>
//                   <td>{u.id}</td>
//                   <td>{u.phone}</td>
//                   <td>{u.points}</td>
//                   <td>
//                     {pending.length === 0 ? (
//                       <span style={{ opacity: 0.5 }}>—</span>
//                     ) : (
//                       <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//                         {pending.map((p) => (
//                           <div
//                             key={p.id}
//                             style={{
//                               background: "#133e1a",
//                               color: "#8ef58a",
//                               padding: "4px 8px",
//                               borderRadius: 12,
//                               display: "inline-flex",
//                               alignItems: "center",
//                               gap: 6,
//                             }}
//                             title={`BRL ${p.amountBRL} → +${p.points} P (status: ${p.status})`}
//                           >
//                             +{p.points} P
//                             <button
//                               type="button"
//                               onClick={() => creditPayment(p.id)}
//                               style={{
//                                 marginLeft: 6,
//                                 padding: "2px 6px",
//                                 border: "none",
//                                 borderRadius: 8,
//                                 background: "#21a453",
//                                 color: "#fff",
//                                 cursor: "pointer",
//                               }}
//                             >
//                               Credit
//                             </button>
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </td>
//                   <td>
//                     <input
//                       type="number"
//                       value={amounts[u.id] || ""}
//                       onChange={(e) =>
//                         setAmounts((s) => ({ ...s, [u.id]: e.target.value }))
//                       }
//                       placeholder="Add pwen"
//                       style={{ width: "90px" }}
//                     />
//                   </td>
//                   <td>
//                     <button type="button" onClick={() => handleAddPwen(u.id)}>
//                       Add
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       )}

//       {/* 🆕 Disable / Enable Numbers Section */}
//       <div
//         style={{
//           marginTop: "2rem",
//           padding: "1rem",
//           background: "#0f172a",
//           borderRadius: "12px",
//           color: "#e5e7eb",
//         }}
//       >
//         <h3>🚫 Disable Numbers</h3>
//         <p style={{ opacity: 0.8 }}>
//           Enter one or more numbers separated by commas (e.g. 2,10,20,25)
//           to block players from betting on them. <br />
//           Click ❌ to enable a number again.
//         </p>

//         <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
//           <input
//             type="text"
//             value={inputValue}
//             onChange={(e) => setInputValue(e.target.value)}
//             placeholder="e.g. 2,10,20,25"
//             style={{
//               width: "300px",
//               padding: "6px",
//               borderRadius: "6px",
//               border: "1px solid #555",
//             }}
//           />
//           <button onClick={saveDisabledNumbers}>Add / Save</button>
//         </div>

//         <div style={{ marginTop: 12 }}>
//           <strong>Currently disabled:</strong>
//           {disabledNumbers.length === 0 ? (
//             <span style={{ opacity: 0.6 }}> None</span>
//           ) : (
//             <div
//               style={{
//                 display: "flex",
//                 flexWrap: "wrap",
//                 gap: "8px",
//                 marginTop: "8px",
//               }}
//             >
//               {disabledNumbers.map((num) => (
//                 <div
//                   key={num}
//                   style={{
//                     background: "#1e293b",
//                     padding: "4px 10px",
//                     borderRadius: "16px",
//                     display: "inline-flex",
//                     alignItems: "center",
//                     gap: "6px",
//                   }}
//                 >
//                   <span>{num}</span>
//                   <button
//                     onClick={() => enableNumber(num)}
//                     style={{
//                       border: "none",
//                       background: "transparent",
//                       color: "#f87171",
//                       cursor: "pointer",
//                       fontSize: "14px",
//                     }}
//                   >
//                     ❌
//                   </button>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [paidPayments, setPaidPayments] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [loading, setLoading] = useState(false);

  // 🔒 disable numbers & locations
  const [disabledNumbers, setDisabledNumbers] = useState([]);
  const [disabledLocations, setDisabledLocations] = useState([]);
  const [inputNumbers, setInputNumbers] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const token = localStorage.getItem("token") || "";
  const auth = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  /* ---------------- Fetching Data ---------------- */
  const fetchUsers = async () => {
    const res = await axios.get(`${API}/api/admin/users`, auth);
    setUsers(res.data);
  };

  const fetchPaidPayments = async () => {
    const res = await axios.get(`${API}/api/admin/payments?status=paid`, auth);
    setPaidPayments(res.data);
  };

  const fetchDisabledNumbers = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/disabled-numbers`, auth);
      setDisabledNumbers(res.data);
    } catch (e) {
      console.error("Failed to load disabled numbers", e);
    }
  };

  const fetchDisabledLocations = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/disabled-locations`, auth);
      setDisabledLocations(res.data);
    } catch (e) {
      console.error("Failed to load disabled locations", e);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchPaidPayments(),
        fetchDisabledNumbers(),
        fetchDisabledLocations(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll().catch(console.error);
  }, [token]);

  /* ---------------- User Actions ---------------- */
  const handleAddPwen = async (userId) => {
    const amount = parseInt(amounts[userId], 10);
    if (!amount || Number.isNaN(amount)) return alert("Enter a valid number");
    try {
      const res = await axios.post(
        `${API}/api/admin/users/${userId}/add-pwen`,
        { amount },
        auth
      );
      alert(res.data.message);
      await fetchUsers();
      setAmounts((s) => ({ ...s, [userId]: "" }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add pwen");
    }
  };

  const grouped = useMemo(
    () =>
      paidPayments.reduce((acc, p) => {
        (acc[p.userId] ||= []).push(p);
        return acc;
      }, {}),
    [paidPayments]
  );

  const creditPayment = async (paymentId) => {
    try {
      const res = await axios.post(
        `${API}/api/admin/payments/${paymentId}/credit`,
        {},
        auth
      );
      alert(res.data.message || "Credited");
      await refreshAll();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to credit payment");
    }
  };

  /* ---------------- Disable Numbers ---------------- */
  const saveDisabledNumbers = async () => {
    try {
      const newNumbers = inputNumbers
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);

      if (newNumbers.length === 0) return alert("Enter at least one number");

      const merged = Array.from(new Set([...disabledNumbers, ...newNumbers]));
      const res = await axios.post(
        `${API}/api/admin/disabled-numbers`,
        { numbers: merged },
        auth
      );

      alert(res.data.message || "Disabled numbers updated");
      setDisabledNumbers(res.data.disabledNumbers || merged);
      setInputNumbers("");
    } catch (e) {
      alert(e.response?.data?.message || "Failed to update disabled numbers");
    }
  };

  const enableNumber = async (num) => {
    const updated = disabledNumbers.filter((n) => n !== num);
    setDisabledNumbers(updated);
    try {
      await axios.post(`${API}/api/admin/disabled-numbers`, { numbers: updated }, auth);
    } catch {
      alert("Failed to enable number back");
    }
  };

  /* ---------------- Disable Locations ---------------- */
  const addDisabledLocation = async () => {
    if (!selectedLocation) return alert("Please select a location first.");
    const merged = Array.from(new Set([...disabledLocations, selectedLocation]));
    try {
      const res = await axios.post(
        `${API}/api/admin/disabled-locations`,
        { locations: merged },
        auth
      );
      setDisabledLocations(res.data.disabledLocations || merged);
      alert("Location disabled/updated successfully");
    } catch (e) {
      alert(e.response?.data?.message || "Failed to disable location");
    }
  };

  const enableLocation = async (loc) => {
    const updated = disabledLocations.filter((l) => l !== loc);
    setDisabledLocations(updated);
    try {
      await axios.post(`${API}/api/admin/disabled-locations`, { locations: updated }, auth);
    } catch {
      alert("Failed to enable location");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div style={{ padding: "2rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2>👑 Admin Dashboard — Manage Users</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/admin/bets">
            <button type="button">Manage Bets</button>
          </Link>
          <button type="button" onClick={refreshAll} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <p style={{ opacity: 0.6 }}>
        API: {API} · Admin:{" "}
        {String(JSON.parse(localStorage.getItem("isAdmin") || "false"))}
      </p>

      {/* Users Table */}
      {users.length === 0 ? (
        <p>{loading ? "Loading users..." : "No users found."}</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          style={{
            width: "100%",
            marginTop: "1rem",
            borderCollapse: "collapse",
          }}
        >
          <thead style={{ background: "#111", color: "#fff" }}>
            <tr>
              <th>ID</th>
              <th>Phone</th>
              <th>Points</th>
              <th>Paid PIX (pending)</th>
              <th>Add Pwen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const pending = grouped[u.id] || [];
              return (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.phone}</td>
                  <td>{u.points}</td>
                  <td>
                    {pending.length === 0 ? (
                      <span style={{ opacity: 0.5 }}>—</span>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {pending.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              background: "#133e1a",
                              color: "#8ef58a",
                              padding: "4px 8px",
                              borderRadius: 12,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                            title={`BRL ${p.amountBRL} → +${p.points} P (status: ${p.status})`}
                          >
                            +{p.points} P
                            <button
                              type="button"
                              onClick={() => creditPayment(p.id)}
                              style={{
                                marginLeft: 6,
                                padding: "2px 6px",
                                border: "none",
                                borderRadius: 8,
                                background: "#21a453",
                                color: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              Credit
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      value={amounts[u.id] || ""}
                      onChange={(e) =>
                        setAmounts((s) => ({ ...s, [u.id]: e.target.value }))
                      }
                      placeholder="Add pwen"
                      style={{ width: "90px" }}
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => handleAddPwen(u.id)}>
                      Add
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Disable Numbers */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#0f172a",
          borderRadius: "12px",
          color: "#e5e7eb",
        }}
      >
        <h3>🚫 Disable Numbers</h3>
        <p style={{ opacity: 0.8 }}>
          Enter one or more numbers separated by commas (e.g. 2,10,20,25)
          to block players from betting on them. <br />
          Click ❌ to enable a number again.
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <input
            type="text"
            value={inputNumbers}
            onChange={(e) => setInputNumbers(e.target.value)}
            placeholder="e.g. 2,10,20,25"
            style={{
              width: "300px",
              padding: "6px",
              borderRadius: "6px",
              border: "1px solid #555",
            }}
          />
          <button onClick={saveDisabledNumbers}>Add / Save</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Currently disabled:</strong>
          {disabledNumbers.length === 0 ? (
            <span style={{ opacity: 0.6 }}> None</span>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              {disabledNumbers.map((num) => (
                <div
                  key={num}
                  style={{
                    background: "#1e293b",
                    padding: "4px 10px",
                    borderRadius: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{num}</span>
                  <button
                    onClick={() => enableNumber(num)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disable Locations */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#1e293b",
          borderRadius: "12px",
          color: "#e5e7eb",
        }}
      >
        <h3>🌎 Disable Locations</h3>
        <p style={{ opacity: 0.8 }}>
          Choose a location to disable (e.g. New York or Florida). Players won’t be able to
          place bets there until re-enabled.
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{
              padding: "6px",
              borderRadius: "6px",
              border: "1px solid #555",
            }}
          >
            <option value="">Select a location...</option>
            <option value="New York">New York</option>
            <option value="Florida">Florida</option>
          </select>
          <button onClick={addDisabledLocation}>Add / Save</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Currently disabled locations:</strong>
          {disabledLocations.length === 0 ? (
            <span style={{ opacity: 0.6 }}> None</span>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              {disabledLocations.map((loc) => (
                <div
                  key={loc}
                  style={{
                    background: "#334155",
                    padding: "4px 10px",
                    borderRadius: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{loc}</span>
                  <button
                    onClick={() => enableLocation(loc)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
