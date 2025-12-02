
import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import styles from "./PixPayment.module.css";
import logoLotto from "../assets/logo.png";
import logoSmall from "../assets/pix.jpg";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function PixPayment() {
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [showReceipt, setShowReceipt] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copyPaste, setCopyPaste] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const vencimento = (() => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    return `${String(dueDate.getDate()).padStart(2, "0")}/${String(
      dueDate.getMonth() + 1
    ).padStart(2, "0")}/${dueDate.getFullYear()} - 23:59`;
  })();

  const digits = (v) => (v || "").replace(/\D/g, "");

  async function tryFetchQrAgain(id) {
    try {
      const res = await fetch(`${API_BASE}/api/pix/qr/${id}`);
      if (res.status === 204) return; // nothing new yet
      const data = await res.json();
      const base64 = data.qrCode;
      const emv = data.copyPaste;

      if (base64) setQrDataUrl(`data:image/png;base64,${base64}`);
      if (emv) setCopyPaste(emv);
      if (data.invoiceUrl) setInvoiceUrl(data.invoiceUrl);
    } catch {}
  }

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userId = 1; // TODO: real logged-in id

      const payload = {
        userId,
        amountBRL: Number(amount),
        description: "Lotto payment",
        name: name?.trim(),
        cpfCnpj: digits(cpfCnpj),
        email: email?.trim(),
        phone: phone?.trim(),
      };

      const res = await fetch(`${API_BASE}/api/pix/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch {}

      if (!res.ok) {
        const msg = (data && (data.error || data.detail || data.message)) || raw || res.statusText;
        throw new Error(msg);
      }
      if (!data) throw new Error("Empty response from server.");

      const base64 = data.qrCode || data.qrBase64 || data.pixQrCode;
      const emv = data.copyPaste || data.pixCopyPasteKey;

      if (base64) setQrDataUrl(`data:image/png;base64,${base64}`);
      if (emv) {
        setCopyPaste(emv);
        if (!base64) {
          const url = await QRCode.toDataURL(emv, { errorCorrectionLevel: "M" });
          setQrDataUrl(url);
        }
      }
      if (data.invoiceUrl) setInvoiceUrl(data.invoiceUrl);

      setPaymentId(data.paymentId || data.id || "");
      setStatus(data.status || "PENDING");
      setShowReceipt(true);

      // if we didn't get QR yet, try to fetch again after a few seconds
      if (!base64 && !emv && (data.paymentId || data.id)) {
        setTimeout(() => tryFetchQrAgain(data.paymentId || data.id), 3000);
      }
    } catch (err) {
      alert(`Erro ao gerar PIX: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!paymentId) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pix/status/${paymentId}`);
        const data = await res.json();
        if (res.ok && data?.status) {
          setStatus(data.status);
          if (data.status === "CONFIRMED" || data.status === "RECEIVED") {
            clearInterval(t);
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [paymentId]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(copyPaste);
      alert("✅ Kòd Pix kopye!");
    } catch {
      alert("❌ Erè: Pa ka kopye kòd la.");
    }
  };

  return (
    <div className={styles.container}>
      {!showReceipt ? (
        <form onSubmit={handleGenerate} className={styles.form}>
          <h2>Peman Avèk Pix</h2>

          <label>Kantite pou peye (BRL):</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />

          <div className={styles.hr} />
          <h3>Dados do pagador (necessários 1ª vez)</h3>

          <label>Nome completo</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />

          <label>CPF/CNPJ (somente números)</label>
          <input type="text" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} required />

          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Telefone (DDI+DDD+Número, ex: 5599999999999)</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />

          <button type="submit" className={styles.payButton} disabled={loading}>
            {loading ? "Ap jenere..." : "Peye ak Pix"}
          </button>
        </form>
      ) : (
        <div className={styles.receiptBox}>
          <div className={styles.header}>
            <img src={logoLotto} alt="Lotto Logo" className={styles.logo} />
            <img src={logoSmall} alt="Pix Logo" className={styles.pixLogo} />
          </div>

          <div className={styles.amountRow}>
            <span className={styles.label}>Valor:</span>
            <span className={styles.value}>BRL {Number(amount).toFixed(2)}</span>
          </div>

          <div className={styles.amountRow}>
            <span className={styles.label}>Vencimento:</span>
            <span className={styles.value}>{vencimento}</span>
          </div>

          <p className={styles.instruction}>
            Abra seu app bancário, use “copia e cola” ou aponte a câmera para o QR.
          </p>

          {copyPaste && (
            <>
              <input type="text" value={copyPaste} readOnly className={styles.pixInput} />
              <button onClick={copyCode} className={styles.copyButton}>📋 Copie Kòd Pix</button>
            </>
          )}

          <p className={styles.or}>ou Escaneie o código QR</p>

          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Pix" className={styles.qrImage} />
          ) : invoiceUrl ? (
            <>
              <a href={invoiceUrl} target="_blank" rel="noreferrer" className={styles.payButton}>
                Abrir página de pagamento (Asaas)
              </a>
              <button onClick={() => tryFetchQrAgain(paymentId)} className={styles.secondaryButton}>
                Tentar obter QR novamente
              </button>
            </>
          ) : (
            <button onClick={() => tryFetchQrAgain(paymentId)} className={styles.secondaryButton}>
              Tentar obter QR novamente
            </button>
          )}

          <p className={styles.status}>
            Status: <strong>{status || "PENDING"}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
