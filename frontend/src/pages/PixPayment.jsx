
// import React, { useEffect, useState } from "react";
// import QRCode from "qrcode";
// import styles from "./PixPayment.module.css";
// import logoLotto from "../assets/logo.png";
// import logoSmall from "../assets/pix.jpg";

// const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// export default function PixPayment() {
//   const [amount, setAmount] = useState("");
//   const [name, setName] = useState("");
//   const [cpfCnpj, setCpfCnpj] = useState("");
//   const [email, setEmail] = useState("");
//   const [phone, setPhone] = useState("");

//   const [showReceipt, setShowReceipt] = useState(false);
//   const [qrDataUrl, setQrDataUrl] = useState("");
//   const [copyPaste, setCopyPaste] = useState("");
//   const [invoiceUrl, setInvoiceUrl] = useState("");
//   const [paymentId, setPaymentId] = useState("");
//   const [status, setStatus] = useState("");
//   const [loading, setLoading] = useState(false);

//   const vencimento = (() => {
//     const dueDate = new Date();
//     dueDate.setDate(dueDate.getDate() + 1);
//     return `${String(dueDate.getDate()).padStart(2, "0")}/${String(
//       dueDate.getMonth() + 1
//     ).padStart(2, "0")}/${dueDate.getFullYear()} - 23:59`;
//   })();

//   const digits = (v) => (v || "").replace(/\D/g, "");

//   async function tryFetchQrAgain(id) {
//     try {
//       const res = await fetch(`${API_BASE}/api/pix/qr/${id}`);
//       if (res.status === 204) return; // nothing new yet
//       const data = await res.json();
//       const base64 = data.qrCode;
//       const emv = data.copyPaste;

//       if (base64) setQrDataUrl(`data:image/png;base64,${base64}`);
//       if (emv) setCopyPaste(emv);
//       if (data.invoiceUrl) setInvoiceUrl(data.invoiceUrl);
//     } catch {}
//   }

//  const handleGenerate = async (e) => {
//   e.preventDefault();
//   setLoading(true);

//   try {
//     // ✅ GET REAL LOGGED-IN USER
//     const user = JSON.parse(localStorage.getItem("user") || "{}");
//     const userId = user.id;

//     if (!userId) {
//       throw new Error("Utilisateur non connecté");
//     }

//     const payload = {
//       userId, // ✅ REAL USER ID (NO MORE HARD-CODED 1)
//       amountBRL: Number(amount),
//       description: "Lotto payment",
//       name: name?.trim(),
//       cpfCnpj: digits(cpfCnpj),
//       email: email?.trim(),
//       phone: phone?.trim(),
//     };

//     const res = await fetch(`${API_BASE}/api/pix/create`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     const raw = await res.text();
//     let data = null;
//     try {
//       data = raw ? JSON.parse(raw) : null;
//     } catch {}

//     if (!res.ok) {
//       const msg =
//         (data && (data.error || data.detail || data.message)) ||
//         raw ||
//         res.statusText;
//       throw new Error(msg);
//     }

//     if (!data) throw new Error("Empty response from server.");

//     // ✅ HANDLE QR / COPY-PASTE
//     const base64 = data.qrCode || data.qrBase64 || data.pixQrCode;
//     const emv = data.copyPaste || data.pixCopyPasteKey;

//     if (base64) {
//       setQrDataUrl(`data:image/png;base64,${base64}`);
//     }

//     if (emv) {
//       setCopyPaste(emv);
//       if (!base64) {
//         const url = await QRCode.toDataURL(emv, {
//           errorCorrectionLevel: "M",
//         });
//         setQrDataUrl(url);
//       }
//     }

//     if (data.invoiceUrl) setInvoiceUrl(data.invoiceUrl);

//     setPaymentId(data.paymentId || data.id || "");
//     setStatus(data.status || "PENDING");
//     setShowReceipt(true);

//     // 🔁 Try fetching QR again if not ready
//     if (!base64 && !emv && (data.paymentId || data.id)) {
//       setTimeout(
//         () => tryFetchQrAgain(data.paymentId || data.id),
//         3000
//       );
//     }
//   } catch (err) {
//     alert(`Erro ao gerar PIX: ${err.message}`);
//     console.error(err);
//   } finally {
//     setLoading(false);
//   }
// };

//   useEffect(() => {
//     if (!paymentId) return;
//     const t = setInterval(async () => {
//       try {
//         const res = await fetch(`${API_BASE}/api/pix/status/${paymentId}`);
//         const data = await res.json();
//         if (res.ok && data?.status) {
//           setStatus(data.status);
//           if (data.status === "CONFIRMED" || data.status === "RECEIVED") {
//             clearInterval(t);
//           }
//         }
//       } catch {}
//     }, 4000);
//     return () => clearInterval(t);
//   }, [paymentId]);

//   const copyCode = async () => {
//     try {
//       await navigator.clipboard.writeText(copyPaste);
//       alert("✅ Kòd Pix kopye!");
//     } catch {
//       alert("❌ Erè: Pa ka kopye kòd la.");
//     }
//   };

//   return (
//     <div className={styles.container}>
//       {!showReceipt ? (
//         <form onSubmit={handleGenerate} className={styles.form}>
//           <h2>Peman Avèk Pix</h2>

//           <label>Kantite pou peye (BRL):</label>
//           <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />

//           <div className={styles.hr} />
//           <h3>Dados do pagador (necessários 1ª vez)</h3>

//           <label>Nome completo</label>
//           <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />

//           <label>CPF/CNPJ (somente números)</label>
//           <input type="text" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} required />

//           <label>Email</label>
//           <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

//           <label>Telefone (DDI+DDD+Número, ex: 5599999999999)</label>
//           <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />

//           <button type="submit" className={styles.payButton} disabled={loading}>
//             {loading ? "Ap jenere..." : "Peye ak Pix"}
//           </button>
//         </form>
//       ) : (
//         <div className={styles.receiptBox}>
//           <div className={styles.header}>
//             <img src={logoLotto} alt="Lotto Logo" className={styles.logo} />
//             <img src={logoSmall} alt="Pix Logo" className={styles.pixLogo} />
//           </div>

//           <div className={styles.amountRow}>
//             <span className={styles.label}>Valor:</span>
//             <span className={styles.value}>BRL {Number(amount).toFixed(2)}</span>
//           </div>

//           <div className={styles.amountRow}>
//             <span className={styles.label}>Vencimento:</span>
//             <span className={styles.value}>{vencimento}</span>
//           </div>

//           <p className={styles.instruction}>
//             Abra seu app bancário, use “copia e cola” ou aponte a câmera para o QR.
//           </p>

//           {copyPaste && (
//             <>
//               <input type="text" value={copyPaste} readOnly className={styles.pixInput} />
//               <button onClick={copyCode} className={styles.copyButton}>📋 Copie Kòd Pix</button>
//             </>
//           )}

//           <p className={styles.or}>ou Escaneie o código QR</p>

//           {qrDataUrl ? (
//             <img src={qrDataUrl} alt="QR Pix" className={styles.qrImage} />
//           ) : invoiceUrl ? (
//             <>
//               <a href={invoiceUrl} target="_blank" rel="noreferrer" className={styles.payButton}>
//                 Abrir página de pagamento (Asaas)
//               </a>
//               <button onClick={() => tryFetchQrAgain(paymentId)} className={styles.secondaryButton}>
//                 Tentar obter QR novamente
//               </button>
//             </>
//           ) : (
//             <button onClick={() => tryFetchQrAgain(paymentId)} className={styles.secondaryButton}>
//               Tentar obter QR novamente
//             </button>
//           )}

//           <p className={styles.status}>
//             Status: <strong>{status || "PENDING"}</strong>
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }
// PixPayment.jsx (React component)
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
      if (res.status === 204) return;
      const data = await res.json();
      const base64 = data.qrCode;
      const emv = data.copyPaste;

      if (base64) setQrDataUrl(`data:image/png;base64,${base64}`);
      if (emv) setCopyPaste(emv);
      if (data.invoiceUrl) setInvoiceUrl(data.invoiceUrl);
    } catch (err) {
      console.error("Error fetching QR:", err);
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ GET REAL LOGGED-IN USER
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id;

      console.log("🧪 DEBUG - Current user from localStorage:", user);
      console.log("🧪 DEBUG - User ID being sent:", userId);
      
      if (!userId) {
        alert("Veuillez vous connecter d'abord");
        throw new Error("Utilisateur non connecté");
      }

      const payload = {
        userId, // ✅ REAL USER ID
        amountBRL: Number(amount),
        description: "Lotto payment",
        name: name?.trim(),
        cpfCnpj: digits(cpfCnpj),
        email: email?.trim(),
        phone: phone?.trim(),
      };

      console.log("📤 DEBUG - Payload being sent to server:", payload);

      const res = await fetch(`${API_BASE}/api/pix/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      console.log("📥 DEBUG - Server response raw:", raw);
      
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (parseErr) {
        console.error("❌ Failed to parse server response:", parseErr);
        throw new Error("Invalid server response");
      }

      if (!res.ok) {
        const msg =
          (data && (data.error || data.detail || data.message)) ||
          raw ||
          res.statusText;
        console.error("❌ Server error response:", msg);
        throw new Error(msg);
      }

      console.log("✅ DEBUG - Server success response:", data);

      // ✅ HANDLE QR / COPY-PASTE
      const base64 = data.qrCode || data.qrBase64 || data.pixQrCode;
      const emv = data.copyPaste || data.pixCopyPasteKey;

      if (base64) {
        console.log("✅ QR Code received as base64");
        setQrDataUrl(`data:image/png;base64,${base64}`);
      }

      if (emv) {
        console.log("✅ Copy-paste code received");
        setCopyPaste(emv);
        if (!base64) {
          const url = await QRCode.toDataURL(emv, {
            errorCorrectionLevel: "M",
          });
          setQrDataUrl(url);
        }
      }

      if (data.invoiceUrl) {
        console.log("✅ Invoice URL received:", data.invoiceUrl);
        setInvoiceUrl(data.invoiceUrl);
      }

      setPaymentId(data.paymentId || data.id || "");
      setStatus(data.status || "PENDING");
      setShowReceipt(true);

      console.log("✅ Payment created:", {
        paymentId: data.paymentId,
        providerPaymentId: data.providerPaymentId,
        userId: data.userId,
        status: data.status
      });

      // 🔁 Try fetching QR again if not ready
      if (!base64 && !emv && (data.paymentId || data.id)) {
        console.log("🔄 QR not ready, will retry in 3 seconds...");
        setTimeout(() => {
          console.log("🔄 Retrying QR fetch for ID:", data.paymentId || data.id);
          tryFetchQrAgain(data.paymentId || data.id);
        }, 3000);
      }
    } catch (err) {
      console.error("🔥 Error generating PIX:", err);
      alert(`Erro ao gerar PIX: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Poll payment status
  useEffect(() => {
    if (!paymentId) return;
    
    console.log(`🔄 Starting status polling for payment: ${paymentId}`);
    
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pix/status/${paymentId}`);
        const data = await res.json();
        if (res.ok && data?.status) {
          console.log(`📊 Payment ${paymentId} status update:`, data.status);
          setStatus(data.status);
          if (data.status === "CONFIRMED" || data.status === "RECEIVED") {
            console.log(`✅ Payment ${paymentId} completed!`);
            clearInterval(intervalId);
            
            // Refresh user balance
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            if (user.id) {
              try {
                const userRes = await fetch(`${API_BASE}/api/users/${user.id}`);
                const userData = await userRes.json();
                if (userRes.ok) {
                  localStorage.setItem("user", JSON.stringify(userData));
                  console.log("🔄 User balance updated in localStorage");
                }
              } catch (err) {
                console.error("Error refreshing user data:", err);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 4000);
    
    return () => clearInterval(intervalId);
  }, [paymentId]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(copyPaste);
      alert("✅ Kòd Pix kopye!");
    } catch {
      alert("❌ Erè: Pa ka kopye kòd la.");
    }
  };

  // Debug function to check all payments
  const checkDebugInfo = async () => {
    try {
      console.log("🔍 Checking debug info...");
      
      // Check users
      const usersRes = await fetch(`${API_BASE}/api/pix/debug/users`);
      const usersData = await usersRes.json();
      console.log("👥 Users in system:", usersData);
      
      // Check payments
      const paymentsRes = await fetch(`${API_BASE}/api/pix/debug/payments`);
      const paymentsData = await paymentsRes.json();
      console.log("💰 Payments in system:", paymentsData);
      
      alert("Check browser console for debug info");
    } catch (err) {
      console.error("Debug error:", err);
    }
  };

  return (
    <div className={styles.container}>
      {!showReceipt ? (
        <form onSubmit={handleGenerate} className={styles.form}>
          <h2>Peman Avèk Pix</h2>

          <label>Kantite pou peye (BRL):</label>
          <input 
            type="number" 
            step="0.01" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            required 
          />

          <div className={styles.hr} />
          {/* <h3>Dados do pagador (necessários 1ª vez)</h3> */}

          <label>Nome completo</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />

          <label>CPF/CNPJ (somente números)</label>
          <input 
            type="text" 
            value={cpfCnpj} 
            onChange={(e) => setCpfCnpj(e.target.value)} 
            required 
          />

          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />

          <label>Telefone (DDI+DDD+Número, ex: 5599999999999)</label>
          <input 
            type="tel" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            required 
          />

          <button type="submit" className={styles.payButton} disabled={loading}>
            {loading ? "Ap jenere..." : "Peye ak Pix"}
          </button>
          
          {/* <button 
            type="button" 
            onClick={checkDebugInfo}
            className={styles.debugButton}
            style={{ 
              marginTop: '10px', 
              backgroundColor: '#666',
              fontSize: '12px',
              padding: '5px 10px'
            }}
          >
            Debug Info
          </button> */}
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
            Abra seu app bancário, use "copia e cola" ou aponte a câmera para o QR.
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
          
          {paymentId && (
            <p className={styles.paymentId}>
              Payment ID: <code>{paymentId}</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}