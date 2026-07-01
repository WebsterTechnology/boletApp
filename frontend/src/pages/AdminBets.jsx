
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./AdminBets.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const GAME_LABELS = {
  yonchif: "Yon Chif",
  dechif: "Bòlèt",
  twachif: "Loto 3",
  katchif: "Loto 4",
  maryaj: "Maryaj",
};

const GAME_ORDER = ["dechif", "twachif", "maryaj", "katchif", "yonchif"];

const STATUS_LABELS = {
  pending: "PENDING",
  won: "WON",
  lost: "LOST",
  paid: "PAID",
};

const normalizeType = (type = "") =>
  String(type).toLowerCase().replace(/\s+/g, "");

const fmtDate = (d) => (!d ? "-" : new Date(d).toLocaleDateString());

const fmtTime = (d) =>
  !d
    ? "-"
    : new Date(d).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

const getDayKey = (d) => {
  if (!d) return "unknown";
  return new Date(d).toISOString().slice(0, 10);
};

const getDayTitle = (d) => {
  if (!d) return "Unknown Date";
  return new Date(d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const getLocation = (bet) =>
  bet.draw || bet.location || bet.lot || bet.city || "Unknown";

const getNumbers = (bet) => {
  const type = normalizeType(bet.type);

  if (type === "maryaj") {
    if (bet.part1 && bet.part2) return `${bet.part1} x ${bet.part2}`;
    if (bet.numbers) return String(bet.numbers).replace("-", " x ");
  }

  return bet.numbers || bet.number || "-";
};

const getPwen = (bet) => Number(bet.pwen || bet.amount || 0);

const getCustomerName = (bet) =>
  bet.name || bet.username || bet.customerName || bet.userName || "Customer";

const getPhone = (bet) =>
  bet.phone || bet.customerPhone || `user:${bet.userId || "unknown"}`;

/* SAME LOGIC AS FICH.JSX */
const groupReceipts = (items) => {
  const receipts = {};

  items.forEach((bet) => {
    const receiptId = bet.receiptId || `old-${bet.id}`;

    if (!receipts[receiptId]) {
      receipts[receiptId] = {
        receiptId,
        location: getLocation(bet),
        createdAt: bet.createdAt,
        status: bet.status || "pending",
        customerName: getCustomerName(bet),
        phone: getPhone(bet),
        bets: [],
      };
    }

    receipts[receiptId].bets.push(bet);
  });

  return Object.values(receipts).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

const groupByDay = (receipts) => {
  const days = {};

  receipts.forEach((receipt) => {
    const key = getDayKey(receipt.createdAt);

    if (!days[key]) {
      days[key] = {
        key,
        title: getDayTitle(receipt.createdAt),
        receipts: [],
      };
    }

    days[key].receipts.push(receipt);
  });

  return Object.values(days).sort(
    (a, b) => new Date(b.key) - new Date(a.key)
  );
};

function ReceiptCard({ receipt, busy, onChangeStatus }) {
  const grouped = {};

  receipt.bets.forEach((bet) => {
    const type = normalizeType(bet.type);
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(bet);
  });

  const total = receipt.bets.reduce((sum, bet) => sum + getPwen(bet), 0);
  const status = String(receipt.status || "pending").toLowerCase();

  return (
    <div className="adminReceiptWrap">
      <div className="receiptPaper">
        <div className="receiptTitle">{receipt.location}</div>

        <div className="receiptSub">
          Receipt #{String(receipt.receiptId).slice(0, 8)}
        </div>

        <div className={`receiptStatus status-${status}`}>
          {STATUS_LABELS[status] || "PENDING"}
        </div>

        <div className="receiptDash" />

        {GAME_ORDER.map((type) => {
          const bets = grouped[type] || [];
          if (bets.length === 0) return null;

          return (
            <div key={type}>
              <div className="gameLabelBox">
                <span>{GAME_LABELS[type]}</span>
              </div>

              {bets.map((bet) => (
                <div key={`${bet.type}-${bet.id}`} className="receiptRow">
                  <span>{getNumbers(bet)}</span>
                  <span>=</span>
                  <strong>{getPwen(bet)}</strong>
                </div>
              ))}
            </div>
          );
        })}

        <div className="receiptDash" />

        <div className="receiptTotal">*Total {total}*</div>

        <div className="receiptDash" />

        <div className="receiptInfo">
          <div>Customer: <strong>{receipt.customerName}</strong></div>
          <div>Phone: <strong>{receipt.phone}</strong></div>
          <div>{fmtDate(receipt.createdAt)}</div>
          <div>{fmtTime(receipt.createdAt)}</div>
          <div>LoteNetsoft</div>
        </div>
      </div>

      <div className="adminActions">
        <button className="actionBtn wonBtn" disabled={busy} onClick={() => onChangeStatus(receipt, "won")}>✅ WON</button>
        <button className="actionBtn lostBtn" disabled={busy} onClick={() => onChangeStatus(receipt, "lost")}>❌ LOST</button>
        <button className="actionBtn paidBtn" disabled={busy} onClick={() => onChangeStatus(receipt, "paid")}>💸 PAID</button>
        <button className="actionBtn pendingBtn" disabled={busy} onClick={() => onChangeStatus(receipt, "pending")}>🕓 PENDING</button>
      </div>
    </div>
  );
}

export default function AdminBets() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyReceipt, setBusyReceipt] = useState(null);

  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [openDays, setOpenDays] = useState({});

  const token = localStorage.getItem("token") || "";

  const auth = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  const load = async () => {
    setLoading(true);

    try {
      const params = {};
      if (type !== "all") params.type = type;
      if (status !== "all") params.status = status;

      const res = await axios.get(`${API}/api/admin/bets`, {
        ...auth,
        params,
      });

      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setItems(list);
    } catch (err) {
      console.error(err);
      alert("Unable to load bets");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type, status]);

  const updateReceiptStatus = async (receipt, newStatus) => {
    setBusyReceipt(receipt.receiptId);

    try {
      await Promise.all(
        receipt.bets.map((bet) =>
          axios.patch(
            `${API}/api/admin/bets/${bet.type}/${bet.id}/status`,
            { status: newStatus },
            auth
          )
        )
      );

      await load();
    } catch (err) {
      console.error(err);
      alert("Unable to update receipt");
    } finally {
      setBusyReceipt(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((b) => {
      const text = `
        ${b.phone || ""}
        ${b.customerPhone || ""}
        ${b.numbers || ""}
        ${b.number || ""}
        ${b.type || ""}
        ${b.receiptId || ""}
        ${b.draw || ""}
      `.toLowerCase();

      return text.includes(q);
    });
  }, [items, search]);

  const receipts = useMemo(() => groupReceipts(filtered), [filtered]);
  const dayGroups = useMemo(() => groupByDay(receipts), [receipts]);

  useEffect(() => {
    if (dayGroups.length === 0) return;

    setOpenDays((old) => {
      if (Object.keys(old).length > 0) return old;
      return { [dayGroups[0].key]: true };
    });
  }, [dayGroups]);

  const toggleDay = (key) => {
    setOpenDays((old) => ({
      ...old,
      [key]: !old[key],
    }));
  };

  const expandAll = () => {
    const all = {};
    dayGroups.forEach((g) => {
      all[g.key] = true;
    });
    setOpenDays(all);
  };

  const collapseAll = () => {
    setOpenDays({});
  };

  return (
    <div className="adminPage">
      <div className="topBar">
        <h1>🎰 Admin Bets</h1>
        <button className="refreshBtn" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="filters">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All Games</option>
          <option value="yonchif">Yon Chif</option>
          <option value="dechif">Bòlèt</option>
          <option value="maryaj">Maryaj</option>
          <option value="twachif">Loto 3</option>
          <option value="katchif">Loto 4</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="paid">Paid</option>
        </select>

        <input
          placeholder="Search phone, number, receipt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="quickButtons">
        <button onClick={expandAll}>Expand All Days</button>
        <button onClick={collapseAll}>Collapse All Days</button>
      </div>

      <div className="stats">
        <div>Receipts <strong>{receipts.length}</strong></div>
        <div>Bets <strong>{filtered.length}</strong></div>
        <div>Pending <strong>{filtered.filter((b) => b.status === "pending").length}</strong></div>
        <div>Won <strong>{filtered.filter((b) => b.status === "won").length}</strong></div>
        <div>Lost <strong>{filtered.filter((b) => b.status === "lost").length}</strong></div>
        <div>Paid <strong>{filtered.filter((b) => b.status === "paid").length}</strong></div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : dayGroups.length === 0 ? (
        <div className="loading">No Bets Found</div>
      ) : (
        dayGroups.map((day) => (
          <div key={day.key} className="daySection">
            <div className="dayHeader" onClick={() => toggleDay(day.key)}>
              <div>
                <h2>{day.title}</h2>
                <small>{day.receipts.length} receipts</small>
              </div>
              <div className="dayArrow">{openDays[day.key] ? "▲" : "▼"}</div>
            </div>

            {openDays[day.key] && (
              <div className="receiptGrid">
                {day.receipts.map((receipt) => (
                  <ReceiptCard
                    key={receipt.receiptId}
                    receipt={receipt}
                    busy={busyReceipt === receipt.receiptId}
                    onChangeStatus={updateReceiptStatus}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}