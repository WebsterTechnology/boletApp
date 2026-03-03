
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [loading, setLoading] = useState(false);

  const [disabledNumbers, setDisabledNumbers] = useState([]);
  const [disabledLocations, setDisabledLocations] = useState([]);
  const [inputNumbers, setInputNumbers] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(""); // no default

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

  const fetchDisabledNumbers = async () => {
    const res = await axios.get(`${API}/api/admin/disabled-numbers`, auth);
    setDisabledNumbers(res.data);
  };

  const fetchDisabledLocations = async () => {
    const res = await axios.get(`${API}/api/admin/disabled-locations`, auth);
    setDisabledLocations(res.data);
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchDisabledNumbers(),
      fetchDisabledLocations(),
    ]);
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

  /* ================= DISABLE NUMBERS ================= */

  const saveDisabledNumbers = async () => {
    if (!inputNumbers.trim()) return;

    const newNumbers = inputNumbers
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    const merged = Array.from(new Set([...disabledNumbers, ...newNumbers]));

    const res = await axios.post(
      `${API}/api/admin/disabled-numbers`,
      { numbers: merged },
      auth
    );

    setDisabledNumbers(res.data.disabledNumbers);
    setInputNumbers("");
  };

  const enableNumber = async (num) => {
    const updated = disabledNumbers.filter((n) => n !== num);
    setDisabledNumbers(updated);

    await axios.post(
      `${API}/api/admin/disabled-numbers`,
      { numbers: updated },
      auth
    );
  };

  /* ================= DISABLE LOCATIONS ================= */

  const addDisabledLocation = async () => {
    if (!selectedLocation) return;

    const merged = Array.from(
      new Set([...disabledLocations, selectedLocation])
    );

    const res = await axios.post(
      `${API}/api/admin/disabled-locations`,
      { locations: merged },
      auth
    );

    setDisabledLocations(res.data.disabledLocations);
    setSelectedLocation("");
  };

  const enableLocation = async (loc) => {
    const updated = disabledLocations.filter((l) => l !== loc);
    setDisabledLocations(updated);

    await axios.post(
      `${API}/api/admin/disabled-locations`,
      { locations: updated },
      auth
    );
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

      <hr />

      <h3>🚫 Disable Numbers</h3>

      <input
        value={inputNumbers}
        onChange={(e) => setInputNumbers(e.target.value)}
        placeholder="2,5,10"
      />
      <button onClick={saveDisabledNumbers}>Save</button>

      <div style={{ marginTop: 10 }}>
        {disabledNumbers.map((n) => (
          <button key={n} onClick={() => enableNumber(n)}>
            ❌ {n}
          </button>
        ))}
      </div>

      <hr />

      <h3>🌎 Disable Locations</h3>

      <select
        value={selectedLocation}
        onChange={(e) => setSelectedLocation(e.target.value)}
      >
        <option value="">Select location</option>
        <option value="New York">New York</option>
        <option value="Florida">Florida</option>
        <option value="Georgia">Georgia</option>
    
      </select>

      <button onClick={addDisabledLocation}>Save</button>

      <div style={{ marginTop: 10 }}>
        {disabledLocations.map((l) => (
          <button key={l} onClick={() => enableLocation(l)}>
            ❌ {l}
          </button>
        ))}
      </div>
    </div>
  );
}
