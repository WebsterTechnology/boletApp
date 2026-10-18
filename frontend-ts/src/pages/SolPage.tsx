import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./SolPage.module.css";

type View = "home" | "packages" | "details" | "transactions" | "menu";
type PaymentMethod = "wallet" | "pix";
type SolDraft = { id: number; monthlyAmountCents: number; dueDay: number; status: string; paidMonths: number };
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PACKAGES = [100, 200, 500, 1000] as const;
type PackageAmount = (typeof PACKAGES)[number];
const money = (amount: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);

export default function SolPage() {
  const [view, setView] = useState<View>("home");
  const [amount, setAmount] = useState<PackageAmount>(100);
  const [dueDay, setDueDay] = useState(15);
  const [method, setMethod] = useState<PaymentMethod>("wallet");
  const [showPaymentNotice, setShowPaymentNotice] = useState(false);
  const [drafts, setDrafts] = useState<SolDraft[]>([]);
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftError, setDraftError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState("");
  const loadDrafts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setDraftError("Tanpri konekte ankò."); setDraftLoading(false); return; }
    setDraftLoading(true);
    try {
      const response = await fetch(API + "/api/sol/packages", { headers: { Authorization: "Bearer " + token } });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const items: unknown = await response.json();
      if (!Array.isArray(items)) throw new Error("Invalid response");
      setDrafts(items as SolDraft[]);
      setDraftError("");
    } catch { setDraftError("Nou pa kapab chaje pake Sòl yo kounye a."); }
    finally { setDraftLoading(false); }
  }, []);
  useEffect(() => { void loadDrafts(); }, [loadDrafts]);
  const saveDraft = async () => {
    if (savingDraft) return;
    const token = localStorage.getItem("token");
    if (!token) { setDraftError("Tanpri konekte ankò."); return; }
    setSavingDraft(true);
    setDraftSuccess("");
    setDraftError("");
    try {
      const response = await fetch(API + "/api/sol/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ monthlyAmountCents: amount * 100, dueDay }),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      setDraftSuccess("Pake ou anrejistre kòm bouyon. Okenn peman pa fèt.");
      await loadDrafts();
    } catch { setDraftError("Nou pa kapab anrejistre pake a. Okenn peman pa fèt."); }
    finally { setSavingDraft(false); }
  };

  const [userName] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return String(user.fullName || user.name || "").trim().split(" ")[0] || "zanmi";
    } catch { return "zanmi"; }
  });

  const go = (next: View) => { setView(next); setShowPaymentNotice(false); };
  const openDetails = (selected: PackageAmount) => { setAmount(selected); go("details"); };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <div className={styles.brand}><span className={styles.brandMark}>S</span><span>Sòl <small>HTNovaTech</small></span></div>
            <span className={styles.preview}>PREVIEW • Peman dezaktive</span>
          </div>
          <p className={styles.greeting}>Bonjou, {userName} 👋</p>
          <h1>Byenveni nan Sòl ou</h1>
          <p className={styles.heroSub}>Chwazi pake ou, peye chak mwa, epi swiv kontribisyon ou fasil.</p>
        </header>

        {view === "home" && (
          <section className={styles.content}>
            <div className={styles.balanceCard}>
              <span>Balans Sòl mwen</span>
              <strong>{money(0)}</strong>
              <small>Pa gen kontribisyon ki anrejistre pou kounye a.</small>
            </div>
            <h2>Pake mwen yo</h2>
            {draftLoading ? <p role="status">Ap chaje pake ou yo...</p> : draftError ? <p role="alert" className={styles.notice}>{draftError} <button type="button" onClick={() => void loadDrafts()}>Eseye ankò</button></p> : drafts.length ? (
              <div className={styles.packageGrid}>
                {drafts.map(draft => <article className={styles.package} key={draft.id}>
                  <strong>{money(draft.monthlyAmountCents / 100)} <small>/ mwa</small></strong>
                  <p>Estati: {draft.status === "draft" ? "Bouyon — pa aktive" : draft.status}</p>
                  <p>Jou peman: {draft.dueDay} | Mwa peye: {draft.paidMonths}/12</p>
                </article>)}
              </div>
            ) : <p>Ou poko gen okenn pake Sòl ki anrejistre.</p>}
            <h2>Ki sa ou vle fè?</h2>
            <div className={styles.quickGrid}>
              <button onClick={() => go("packages")}><span>📦</span>Pake mwen yo<small>Chwazi yon pake</small></button>
              <button onClick={() => go("packages")}><span>💳</span>Peman mwen yo<small>Plan peman</small></button>
              <button onClick={() => go("transactions")}><span>📋</span>Tranzaksyon<small>Istwa peman</small></button>
              <button onClick={() => window.dispatchEvent(new Event("htnovatech:open-support-chat"))}><span>💬</span>Sipò<small>Chat avèk nou</small></button>
            </div>
            <div className={styles.promo}><span>🌱</span><div><strong>Peye 12, resevwa 13</strong><p>Kontribye pandan 12 mwa. Dekouvri kat pake Sòl yo.</p></div></div>
            <button className={styles.primary} onClick={() => go("packages")}>Chwazi pake mwen <span>→</span></button>
          </section>
        )}

        {view === "packages" && (
          <section className={styles.content}>
            <div className={styles.sectionHead}><h2>Chwazi pake ou</h2><p>Ou ka gen plizyè pake aktif an menm tan. Chak pake gen pwòp peman li.</p></div>
            <div className={styles.packageGrid}>
              {PACKAGES.map((item) => (
                <article className={styles.package} key={item}>
                  <div className={styles.packageTop}><span>Pake {item}</span><span className={styles.duration}>12 mwa</span></div>
                  <strong>{money(item)} <small>/ mwa</small></strong>
                  <div className={styles.packageFigures}><span>Total kontribisyon <b>{money(item * 12)}</b></span><span>Montan final prevwa <b>{money(item * 13)}</b></span></div>
                  <button className={styles.primary} onClick={() => openDetails(item)}>Chwazi pake sa a →</button>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === "details" && (
          <section className={styles.content}>
            <button className={styles.back} onClick={() => go("packages")}>← Retounen nan pake yo</button>
            <div className={styles.sectionHead}><h2>Detay peman</h2><p>Verifye pake ou ak dat ou vle peye chak mwa.</p></div>
            <div className={styles.summary}>
              <div><span>Pake ou</span><strong>Pake {amount}</strong></div>
              <div><span>Peman chak mwa</span><strong>{money(amount)}</strong></div>
              <div><span>Dire</span><strong>12 mwa</strong></div>
              <div><span>Total kontribisyon</span><strong>{money(amount * 12)}</strong></div>
              <div className={styles.finalAmount}><span>Montan final prevwa</span><strong>{money(amount * 13)}</strong></div>
            </div>
            <label className={styles.fieldLabel} htmlFor="sol-due-day">Chwazi jou peman chak mwa</label>
            <select id="sol-due-day" className={styles.select} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))}>
              {Array.from({ length: 28 }, (_, index) => index + 1).map(day => <option key={day} value={day}>Chak {day} nan mwa a</option>)}
            </select>
            <p className={styles.hint}>Ou peye manyèlman chak mwa. Pa gen penalite pou reta.</p>
            <h3>Fason peman</h3>
            <div className={styles.methods}>
              <button aria-pressed={method === "wallet"} className={method === "wallet" ? styles.selectedMethod : ""} onClick={() => setMethod("wallet")}>💼 Saldo Loto <small>Disponib pou jwe + Disponib pou retire</small></button>
              <button aria-pressed={method === "pix"} className={method === "pix" ? styles.selectedMethod : ""} onClick={() => setMethod("pix")}>▦ PIX <small>Montan pake a fiks</small></button>
            </div>
            {method === "pix" ? (
              <div className={styles.fixedAmount}><span>Montan PIX pou peye</span><strong>{money(amount)}</strong><small>🔒 Montan sa a pa kapab modifye. QR code ap disponib apre entegrasyon backend la.</small></div>
            ) : (
              <div className={styles.fixedAmount}><span>Montan pou retire nan balans Loto yo</span><strong>{money(amount)}</strong><small>Sistèm nan pral itilize balans pou jwe an premye, epi balans pou retire. Si total la pa sifi, ou dwe rechaje kont ou anvan.</small></div>
            )}
            <button className={styles.primary} disabled={savingDraft} onClick={() => void saveDraft()}>{savingDraft ? "Ap anrejistre..." : "Anrejistre pake kòm bouyon"}</button>
            {draftSuccess && <p role="status" className={styles.notice}>{draftSuccess}</p>}
            {draftError && <p role="alert" className={styles.notice}>{draftError}</p>}
            <button className={styles.back} onClick={() => setShowPaymentNotice(true)}>Kijan peman ap mache?</button>
            {showPaymentNotice && <p role="status" className={styles.notice}>Sa a se yon aperçu. Nou poko aktive dediksyon balans oswa peman PIX. Okenn lajan pa retire.</p>}
          </section>
        )}

        {view === "transactions" && (
          <section className={styles.content}>
            <h2>Istwa tranzaksyon</h2>
            <div className={styles.empty}><span>📋</span><strong>Pa gen tranzaksyon ankò</strong><p>Lè peman Sòl yo aktive, w ap jwenn tout istwa ou isit la.</p></div>
          </section>
        )}

        {view === "menu" && (
          <section className={styles.content}>
            <h2>Menu Sòl</h2>
            <div className={styles.menuList}>
              <button onClick={() => go("packages")}>📦 Gade pake yo <span>→</span></button>
              <button onClick={() => go("transactions")}>📋 Istwa tranzaksyon <span>→</span></button>
              <Link to="/">🏠 Retounen nan HTNovaTech <span>→</span></Link>
            </div>
          </section>
        )}

        <nav className={styles.bottomNav} aria-label="Navigasyon Sòl">
          {([["home", "⌂", "Kay"], ["packages", "▣", "Pake"], ["transactions", "⇄", "Tranzaksyon"], ["menu", "☰", "Menu"]] as const).map(([id, symbol, label]) => (
            <button key={id} className={(view === id || (view === "details" && id === "packages")) ? styles.activeTab : ""} aria-current={(view === id || (view === "details" && id === "packages")) ? "page" : undefined} onClick={() => go(id)}><span>{symbol}</span>{label}</button>
          ))}
        </nav>
      </div>
    </main>
  );
}
