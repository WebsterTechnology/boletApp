import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./SolPage.module.css";

type View = "home" | "packages" | "details" | "saved" | "transactions" | "menu";
type PaymentMethod = "wallet" | "pix";
type SolContribution = { id: number; installmentNumber: number; amountCents: number; status: string; paidAt: string | null };
type SolPaymentAttempt = { id: number; contributionId: number; amountCents: number; currency: string; method: string; status: string; confirmedAt: string | null; createdAt: string };
type WalletPreview = { packageId: number; installmentNumber: number; amountCents: number; playPoints: number; withdrawablePoints: number; proposedPoints: number; proposedFromPlay: number; proposedFromWithdrawable: number; sufficientUnderProposal: boolean; proposedConversion: string; paymentEnabled: boolean };
type PaymentPreview = { packageId: number; installmentNumber: number; amountCents: number; currency: string; methods: string[]; paymentEnabled: boolean };
type SolDraft = { id: number; monthlyAmountCents: number; dueDay: number; status: string; paidMonths: number; contributions?: SolContribution[] };
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PACKAGES = [100, 200, 500, 1000] as const;
// PIX availability is controlled by the backend checkout/webhook safety gates.
type PackageAmount = (typeof PACKAGES)[number];
const money = (amount: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);

export default function SolPage() {
  const [view, setView] = useState<View>("home");
  const [amount, setAmount] = useState<PackageAmount>(100);
  const [dueDay, setDueDay] = useState(15);
  const [method, setMethod] = useState<PaymentMethod>("wallet");
  const [showPaymentNotice, setShowPaymentNotice] = useState(false);
  const [drafts, setDrafts] = useState<SolDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<SolDraft | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [paymentPreview, setPaymentPreview] = useState<PaymentPreview | null>(null);
  const [walletPreview, setWalletPreview] = useState<WalletPreview | null>(null);
  const [walletPreviewLoading, setWalletPreviewLoading] = useState(false);
  const [walletPreviewError, setWalletPreviewError] = useState("");
  const [payingWallet, setPayingWallet] = useState(false);
  const [payingPix, setPayingPix] = useState(false);
  const [paymentChoiceOpen, setPaymentChoiceOpen] = useState(false);
  const [chosenPayment, setChosenPayment] = useState<PaymentMethod | null>(null);
  const [pixMessage, setPixMessage] = useState("");
  const [pixEnabled, setPixEnabled] = useState(false);
  const refreshPixAvailability = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setPixEnabled(false); return; }
    try {
      const response = await fetch(API + "/api/sol/pix-availability", {
        headers: { Authorization: "Bearer " + token }, cache: "no-store",
      });
      if (!response.ok) { setPixEnabled(false); return; }
      const result = await response.json() as { enabled?: boolean };
      setPixEnabled(result.enabled === true);
    } catch { setPixEnabled(false); }
  }, []);
  useEffect(() => { void refreshPixAvailability(); }, [refreshPixAvailability]);
  const [walletPaymentMessage, setWalletPaymentMessage] = useState("");
  const [walletPaymentError, setWalletPaymentError] = useState("");
  const [paymentPreviewError, setPaymentPreviewError] = useState("");
  const [paymentPreviewLoading, setPaymentPreviewLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<SolPaymentAttempt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [transactionPackages, setTransactionPackages] = useState<SolDraft[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftError, setDraftError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null);
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
    } catch (error) { setDraftError("Nou pa kapab chaje pake Sòl yo kounye a." + (error instanceof Error && error.message.startsWith("HTTP ") ? " (" + error.message + ")" : " Verifye koneksyon an.")); }
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
      const created = (await response.json()) as { id?: number };
      if (!Number.isSafeInteger(created.id) || !created.id || created.id < 1) throw new Error("Invalid package response");
      setDraftSuccess("Pake ou pare. Verifye balans ou epi konfime premye peman an.");
      await loadDrafts();
      await showSavedDraft(created.id);
    } catch (error) { setDraftError("Nou pa kapab fini operasyon an. Verifye lis pake ou yo anvan ou eseye ankò." + (error instanceof Error && error.message.startsWith("HTTP ") ? " (" + error.message + ")" : "")); }
    finally { setSavingDraft(false); }
  };



  const deleteDraft = async (draft: SolDraft) => {
    if (draft.status !== "draft" || draft.paidMonths !== 0 || deletingDraftId !== null) return;
    if (!window.confirm("Efase bouyon pake sa a? Aksyon sa a pa kapab anile.")) return;
    const token = localStorage.getItem("token");
    if (!token) { setDraftError("Tanpri konekte ankò."); return; }
    setDeletingDraftId(draft.id);
    setDraftError("");
    try {
      const response = await fetch(API + "/api/sol/packages/" + draft.id, {
        method: "DELETE", headers: { Authorization: "Bearer " + token },
      });
      if (response.status !== 204) throw new Error("HTTP " + response.status);
      setDrafts(previous => previous.filter(item => item.id !== draft.id));
    } catch { setDraftError("Nou pa kapab efase bouyon sa a. Eseye ankò."); }
    finally { setDeletingDraftId(null); }
  };

  const showSavedDraft = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) { setDraftError("Tanpri konekte ankò."); return; }
    setDetailLoading(true);
    setDetailError("");
    setSelectedDraft(null);
    setPaymentPreview(null);
    setPaymentPreviewError("");
    setWalletPreview(null);
    setWalletPreviewError("");
    setWalletPaymentMessage("");
    setWalletPaymentError("");
    setPaymentHistory([]);
    setHistoryLoaded(false);
    setHistoryError("");
    setView("saved");
    void refreshPixAvailability();
    try {
      const response = await fetch(API + "/api/sol/packages/" + id, { headers: { Authorization: "Bearer " + token } });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const item = (await response.json()) as SolDraft;
      if (!item || item.id !== id || !Array.isArray(item.contributions)) throw new Error("Invalid response");
      setSelectedDraft(item);
      // A confirmed PIX installment must not reuse its intent key next month.
      // Only the backend-confirmed contribution state can release that key.
      const pixKey = "sol-pix-intent-" + id;
      const previousPaidMonths = Number(sessionStorage.getItem("sol-pix-paid-months-" + id));
      if (Number.isSafeInteger(previousPaidMonths) && item.paidMonths > previousPaidMonths) {
        sessionStorage.removeItem(pixKey);
      }
      sessionStorage.setItem("sol-pix-paid-months-" + id, String(item.paidMonths));
      if (item.paidMonths < 12 && item.status !== "cancelled") void loadWalletPreview(id);
    } catch { setDetailError("Nou pa kapab chaje detay pake a. Eseye ankò."); }
    finally { setDetailLoading(false); }
  };


  const loadPaymentPreview = async (packageId: number) => {
    const token = localStorage.getItem("token");
    if (!token) { setPaymentPreviewError("Tanpri konekte ankò."); return; }
    setPaymentPreviewLoading(true);
    setPaymentPreviewError("");
    setPaymentPreview(null);
    try {
      const response = await fetch(API + "/api/sol/packages/" + packageId + "/payment-preview", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const result = (await response.json()) as PaymentPreview;
      if (result.packageId !== packageId || !Number.isSafeInteger(result.amountCents) || result.amountCents <= 0 || result.currency !== "BRL" || result.paymentEnabled !== false) {
        throw new Error("Invalid payment preview");
      }
      setPaymentPreview(result);
    } catch { setPaymentPreviewError("Nou pa kapab prepare enfòmasyon peman an. Eseye ankò."); }
    finally { setPaymentPreviewLoading(false); }
  };

  const loadWalletPreview = async (packageId: number) => {
    const token = localStorage.getItem("token");
    if (!token) { setWalletPreviewError("Tanpri konekte ankò."); return; }
    setWalletPreviewLoading(true);
    setWalletPreview(null);
    setWalletPreviewError("");
    try {
      const response = await fetch(API + "/api/sol/packages/" + packageId + "/wallet-preview", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = (await response.json()) as WalletPreview;
      if (data.packageId !== packageId || typeof data.paymentEnabled !== "boolean" || !Number.isSafeInteger(data.amountCents)) throw new Error("Invalid preview");
      setWalletPreview(data);
    } catch {
      setWalletPreviewError("Nou pa kapab verifye balans pou Sòl la kounye a.");
    } finally {
      setWalletPreviewLoading(false);
    }
  };

  const payWithWallet = async (packageId: number) => {
    if (payingWallet || !walletPreview || walletPreview.packageId !== packageId || !walletPreview.sufficientUnderProposal || !walletPreview.paymentEnabled) return;
    if (!window.confirm("Konfime peman reyèl " + money(walletPreview.amountCents / 100) + " ak balans Loto ou? Yo pral retire pwen yo.")) return;
    const token = localStorage.getItem("token");
    if (!token) { setWalletPaymentError("Tanpri konekte ankò."); return; }
    setPayingWallet(true);
    setWalletPaymentError("");
    setWalletPaymentMessage("");
    // Keep the same key after timeouts or refreshes: retry must never create
    // a second charge while the outcome of the first request is uncertain.
    const storageKey = "sol-wallet-intent-" + packageId;
    let key = sessionStorage.getItem(storageKey);
    if (!key) {
      key = "solwallet_" + crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem(storageKey, key);
    }
    try {
      const intentResponse = await fetch(API + "/api/sol/packages/" + packageId + "/payment-intents", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ method: "wallet" }),
      });
      if (!intentResponse.ok) throw new Error("Nou pa kapab prepare peman an.");
      const intent = await intentResponse.json() as { amountCents: number; method: string };
      if (intent.amountCents !== walletPreview.amountCents || intent.method !== "wallet") throw new Error("Montan peman an pa koresponn.");
      const response = await fetch(API + "/api/sol/packages/" + packageId + "/wallet-payments", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Idempotency-Key": key },
      });
      if (!response.ok) throw new Error("Peman an pa konfime. Verifye istwa peman ou anvan ou eseye ankò.");
      const receipt = await response.json() as { status: string; paidMonths: number };
      if (receipt.status !== "confirmed") throw new Error("Peman an pa konfime. Verifye istwa peman ou.");
      sessionStorage.removeItem(storageKey);
      setWalletPreview(null);
      await showSavedDraft(packageId);
      await loadDrafts();
      setWalletPaymentMessage("Peman konfime! Mwa Sòl ou anrejistre.");
    } catch (error) {
      setWalletPaymentError(error instanceof Error ? error.message : "Peman an pa konfime. Verifye istwa peman ou.");
    } finally {
      setPayingWallet(false);
    }
  };

  const payWithPix = async (packageId: number) => {
    if (!pixEnabled || payingPix || !selectedDraft || selectedDraft.id !== packageId ||
        selectedDraft.paidMonths >= 12) return;
    const token = localStorage.getItem("token");
    if (!token) { setPixMessage("Tanpri konekte ankò."); return; }
    const amountCents = selectedDraft.monthlyAmountCents;
    if (!window.confirm("Ou pral ale sou InfinitePay pou peye " + money(amountCents / 100) + " ak PIX. Peman an ap konfime sèlman apre verifikasyon.")) return;
    setPayingPix(true);
    setPixMessage("");
    const storageKey = "sol-pix-intent-" + packageId;
    let key = sessionStorage.getItem(storageKey);
    if (!key) {
      key = "solpix_" + crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem(storageKey, key);
    }
    try {
      const headers = { Authorization: "Bearer " + token, "Idempotency-Key": key };
      const intentResponse = await fetch(API + "/api/sol/packages/" + packageId + "/payment-intents", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ method: "pix" }),
      });
      if (!intentResponse.ok) throw new Error("Nou pa kapab prepare peman PIX la. Verifye istwa peman ou.");
      const intent = await intentResponse.json() as { amountCents: number; method: string };
      if (intent.method !== "pix" || intent.amountCents !== amountCents) throw new Error("Montan PIX la pa koresponn.");
      const checkoutResponse = await fetch(API + "/api/sol/packages/" + packageId + "/pix-checkout", {
        method: "POST", headers,
      });
      if (checkoutResponse.status === 409) {
        // Checkout may have been settled by a verified webhook, or
        // the reserved provider order may require manual reconciliation.
        // Never redirect based on a conflict or rotate the idempotency key.
        await showSavedDraft(packageId);
        await loadDrafts();
        setPixMessage("Nou rafrechi estati pake a. Si mwa a poko peye, pa kreye yon lòt peman PIX; kontakte sipò pou verifye lòd la.");
        return;
      }
      if (!checkoutResponse.ok) throw new Error("Nou pa kapab ouvri PIX. Pa eseye yon lòt peman anvan ou verifye estati a.");
      const checkout = await checkoutResponse.json() as { checkoutUrl?: string };
      if (!checkout.checkoutUrl) throw new Error("Lyen PIX la pa disponib.");
      const url = new URL(checkout.checkoutUrl);
      if (url.protocol !== "https:" || !(url.hostname === "infinitepay.io" || url.hostname.endsWith(".infinitepay.io"))) {
        throw new Error("Lyen peman an pa valide.");
      }
      // A redirect is not proof of payment; the backend webhook confirms it.
      window.location.assign(url.toString());
    } catch (error) {
      setPixMessage(error instanceof Error ? error.message : "Nou pa kapab prepare PIX la.");
    } finally {
      setPayingPix(false);
    }
  };

  const loadPaymentHistory = async (packageId: number) => {
    const token = localStorage.getItem("token");
    if (!token) { setHistoryError("Tanpri konekte ankò."); return; }
    setHistoryLoading(true);
    setHistoryLoaded(false);
    setHistoryError("");
    setPaymentHistory([]);
    try {
      const response = await fetch(API + "/api/sol/packages/" + packageId + "/payment-attempts", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const result: unknown = await response.json();
      if (!Array.isArray(result)) throw new Error("Invalid history");
      setPaymentHistory(result as SolPaymentAttempt[]);
      setHistoryLoaded(true);
    } catch { setHistoryError("Nou pa kapab chaje istwa peman yo."); }
    finally { setHistoryLoading(false); }
  };

  const loadTransactions = async () => {
    const token = localStorage.getItem("token");
    if (!token) { setTransactionError("Tanpri konekte ankò."); return; }
    setTransactionLoading(true);
    setTransactionError("");
    try {
      const listResponse = await fetch(API + "/api/sol/packages", { headers: { Authorization: "Bearer " + token } });
      if (!listResponse.ok) throw new Error("HTTP " + listResponse.status);
      const packages = await listResponse.json() as SolDraft[];
      if (!Array.isArray(packages)) throw new Error("Invalid package list");
      const details = await Promise.all(packages.map(async (pkg) => {
        const response = await fetch(API + "/api/sol/packages/" + pkg.id, { headers: { Authorization: "Bearer " + token } });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json() as Promise<SolDraft>;
      }));
      setTransactionPackages(details);
    } catch (error) {
      setTransactionError("Nou pa kapab chaje tranzaksyon yo." + (error instanceof Error && error.message.startsWith("HTTP ") ? " (" + error.message + ")" : ""));
    } finally { setTransactionLoading(false); }
  };
  useEffect(() => { if (view === "transactions") void loadTransactions(); }, [view]);

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
            <span className={styles.preview}>Sòl • Peman ak balans Loto</span>
          </div>
          <p className={styles.greeting}>Bonjou, {userName} 👋</p>
          <h1>Byenveni nan Sòl ou</h1>
          <p className={styles.heroSub}>Chwazi pake ou, peye chak mwa, epi swiv kontribisyon ou fasil.</p>
        </header>

        {view === "home" && (
          <section className={styles.content}>
            <button type="button" className={`${styles.primary} ${styles.buyPackageButton}`} onClick={() => go("packages")}>➕ Achte yon pake Sòl <span aria-hidden="true">→</span></button>
            <h2>Pake mwen yo</h2>
            {draftLoading ? <p role="status">Ap chaje pake ou yo...</p> : draftError ? <p role="alert" className={styles.notice}>{draftError} <button type="button" onClick={() => void loadDrafts()}>Eseye ankò</button></p> : drafts.length ? (
              <div className={styles.packageGrid}>
                {drafts.map(draft => <article className={styles.package} key={draft.id}>
                  <strong>{money(draft.monthlyAmountCents / 100)} <small>/ mwa</small></strong>
                  <p>Estati: {draft.status === "draft" ? "Bouyon — pa aktive" : draft.status}</p>
                  <p>Jou peman: {draft.dueDay} | Mwa peye: {draft.paidMonths}/12</p>
                  <button className={styles.back} onClick={() => void showSavedDraft(draft.id)}>Gade 12 kontribisyon yo →</button>
                  {draft.status === "draft" && draft.paidMonths === 0 && <button className={styles.back} disabled={deletingDraftId !== null} onClick={() => void deleteDraft(draft)}>{deletingDraftId === draft.id ? "Ap efase..." : "Efase bouyon"}</button>}
                </article>)}
              </div>
            ) : <p>Ou poko gen okenn pake Sòl ki anrejistre.</p>}
            <h2>Swiv peman ou yo</h2>
            <div className={styles.quickGrid}>
              <button onClick={() => go("transactions")}><span>📋</span>Tranzaksyon<small>Gade peman ki fèt yo</small></button>
              <button onClick={() => window.dispatchEvent(new Event("htnovatech:open-support-chat"))}><span>💬</span>Bezwen èd?<small>Pale avèk nou</small></button>
            </div>
            <div className={styles.promo}><span>🌱</span><div><strong>Peye 12, resevwa 13</strong><p>Kontribye pandan 12 mwa. Dekouvri kat pake Sòl yo.</p></div></div>
            
          </section>
        )}

        {view === "packages" && (
          <section className={styles.content}>
            <div className={styles.sectionHead}><h2>1. Chwazi pake ou</h2><p>Chwazi konbyen ou vle mete chak mwa pandan 12 mwa.</p></div>
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
            <div className={styles.sectionHead}><h2>2. Konfime pake ou</h2><p>Chwazi jou peman an. Premye peman an ap fèt sèlman lè ou konfime li nan pwochen etap la.</p></div>
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
            <h3>💼 Peye ak balans Loto</h3>
            <p className={styles.hint}>Disponib pou jwe + Disponib pou retire. Ou kapab chwazi PIX apre ou anrejistre pake a, lè sèvis la disponib.</p>
            {method === "pix" ? (
              <div className={styles.fixedAmount}><span>Montan PIX pou peye</span><strong>{money(amount)}</strong><small>🔒 Montan sa a pa kapab modifye. Peman PIX ap fèt sou InfinitePay si sèvis la disponib.</small></div>
            ) : (
              <div className={styles.fixedAmount}><span>Montan pou retire nan balans Loto yo</span><strong>{money(amount)}</strong><small>Sistèm nan pral itilize balans pou jwe an premye, epi balans pou retire. Si total la pa sifi, ou dwe rechaje kont ou anvan.</small></div>
            )}
            <button className={styles.primary} disabled={savingDraft} onClick={() => void saveDraft()}>{savingDraft ? "Ap anrejistre..." : "Kontinye pou verifye peman →"}</button>
            {draftSuccess && <p role="status" className={styles.notice}>{draftSuccess}</p>}
            {draftError && <p role="alert" className={styles.notice}>{draftError}</p>}
            <button className={styles.back} onClick={() => setShowPaymentNotice(true)}>Kijan peman ap mache?</button>
            {showPaymentNotice && <p role="status" className={styles.notice}>Anrejistre pake a an premye, epi verifye balans ou. Lè ou konfime peman ak balans Loto, y ap retire pwen reyèl. Peman PIX ap disponib lè sistèm nan aktive.</p>}
          </section>
        )}

        {view === "saved" && (
          <section className={styles.content}>
            <button className={styles.back} onClick={() => go("home")}>← Retounen nan pake mwen yo</button>
            <h2>Detay pake Sòl</h2>
            {detailLoading ? <p role="status">Ap chaje detay pake a...</p> : detailError ? <p role="alert" className={styles.notice}>{detailError}</p> : selectedDraft && (
              <>
                <div className={styles.summary}>
                  <div><span>Kontribisyon chak mwa</span><strong>{money(selectedDraft.monthlyAmountCents / 100)}</strong></div>
                  <div><span>Jou peman</span><strong>{selectedDraft.dueDay}</strong></div>
                  <div><span>Estati</span><strong>{selectedDraft.status === "draft" ? "Bouyon — pa aktive" : selectedDraft.status}</strong></div>
                  <div><span>Mwa peye</span><strong>{selectedDraft.paidMonths}/12</strong></div>
                </div>
                <h3>Pwochen peman</h3>
                <button className={styles.back} type="button" disabled={paymentPreviewLoading} onClick={() => void loadPaymentPreview(selectedDraft.id)}>{paymentPreviewLoading ? "Ap chaje..." : "Gade detay pwochen peman an"}</button>
                {paymentPreviewError && <p role="alert" className={styles.notice}>{paymentPreviewError}</p>}
                {paymentPreview && <div className={styles.summary}>
                  <div><span>Mwa pou peye</span><strong>{paymentPreview.installmentNumber}</strong></div>
                  <div><span>Montan fiks</span><strong>{money(paymentPreview.amountCents / 100)}</strong></div>
                  <div><span>Fason peman prevwa</span><strong>{paymentPreview.methods.join(" / ").toUpperCase()}</strong></div>
                  <p className={styles.hint}>Sa se enfòmasyon sou pwochen peman an. Pa gen lajan ki retire lè ou gade li.</p>
                </div>}
                <div id="sol-payment-options">
                  {selectedDraft.status !== "cancelled" && selectedDraft.status !== "completed" && selectedDraft.paidMonths < 12 && <>
                    <button type="button" className={styles.primary} disabled={payingPix || payingWallet}
                      onClick={() => { setPaymentChoiceOpen(open => !open); setChosenPayment(null); void refreshPixAvailability(); }}>
                      {paymentChoiceOpen ? "Fèmen opsyon peman ▲" : "Peye mwa " + (selectedDraft.paidMonths + 1) + " — " + money(selectedDraft.monthlyAmountCents / 100) + " ▼"}
                    </button>
                    {paymentChoiceOpen && <div className={styles.summary} style={{ marginTop: 16, display: "grid", gap: 12 }}>
                      <h3>Chwazi fason ou vle peye</h3>
                      <p className={styles.hint}>Montan pou peye: <strong>{money(selectedDraft.monthlyAmountCents / 100)}</strong></p>
                      <button type="button" className={styles.primary} disabled={!pixEnabled || payingPix || payingWallet}
                        onClick={() => { setChosenPayment("pix"); void payWithPix(selectedDraft.id); }}>
                        {payingPix ? "Ap prepare PIX..." : "1 — Peye ak PIX (InfinitePay)"}
                      </button>
                      {!pixEnabled && <p className={styles.hint}>PIX poko disponib pou kont sa a.</p>}
                      <button type="button" className={styles.primary} disabled={payingPix || payingWallet || walletPreviewLoading}
                        onClick={() => { setChosenPayment("wallet"); void loadWalletPreview(selectedDraft.id); }}>
                        {walletPreviewLoading ? "Ap verifye balans..." : "2 — Peye ak balans Bolet ou"}
                      </button>
                      {chosenPayment === "wallet" && <>
                        <p className={styles.hint}>Nou itilize Disponib pou jwe an premye, apre sa Disponib pou retire. Nou pap retire lajan san konfimasyon ou.</p>
                        {walletPreviewError && <p role="alert" className={styles.notice}>{walletPreviewError}</p>}
                        {walletPreview && <div className={styles.summary}>
                          <div><span>Kontribisyon</span><strong>{money(walletPreview.amountCents / 100)}</strong></div>
                          <div><span>Disponib pou jwe</span><strong>{walletPreview.playPoints} p</strong></div>
                          <div><span>Disponib pou retire</span><strong>{walletPreview.withdrawablePoints} p</strong></div>
                          <div><span>Pral retire nan balans jwe</span><strong>{walletPreview.proposedFromPlay} p</strong></div>
                          <div><span>Pral retire nan balans retire</span><strong>{walletPreview.proposedFromWithdrawable} p</strong></div>
                          <p className={styles.hint}>{walletPreview.sufficientUnderProposal ? "Balans ou sifi pou peman sa a." : "Balans ou pa sifi. Tanpri rechaje kont ou."}</p>
                          {walletPreview.paymentEnabled ? <button type="button" className={styles.primary}
                            disabled={payingWallet || !walletPreview.sufficientUnderProposal}
                            onClick={() => void payWithWallet(selectedDraft.id)}>
                            {payingWallet ? "Ap trete peman..." : "Konfime peman ak balans — " + money(walletPreview.amountCents / 100)}
                          </button> : <p className={styles.hint}>Peman ak balans poko disponib.</p>}
                        </div>}
                      </>}
                      {pixMessage && <p role="alert" className={styles.notice}>{pixMessage}</p>}
                      {walletPaymentMessage && <p role="status" className={styles.notice}>{walletPaymentMessage}</p>}
                      {walletPaymentError && <p role="alert" className={styles.notice}>{walletPaymentError}</p>}
                    </div>}
                  </>}
                </div>
                <button type="button" className={styles.back} onClick={() => void showSavedDraft(selectedDraft.id)}>Rafrechi estati peman mwen</button>
                <h3>12 kontribisyon yo</h3>
                <div className={styles.packageGrid}>
                  {[...(selectedDraft.contributions || [])].sort((a, b) => a.installmentNumber - b.installmentNumber).map(item => {
                    const paid = item.status === "paid" || Boolean(item.paidAt);
                    const nextUnpaid = selectedDraft.contributions?.filter(contribution => contribution.status !== "paid" && !contribution.paidAt).reduce((first, contribution) => Math.min(first, contribution.installmentNumber), Infinity);
                    const canPay = !paid && item.installmentNumber === nextUnpaid && selectedDraft.status !== "cancelled";
                    return <article className={styles.package} key={item.id}>
                      <div className={styles.packageTop}><span>Mwa {item.installmentNumber}</span><span className={styles.duration}>{paid ? "Peye" : "Annatant"}</span></div>
                      <strong>{money(item.amountCents / 100)}</strong>
                      <small>{item.paidAt ? "Peye: " + new Date(item.paidAt).toLocaleDateString("pt-BR") : "Peman poko fèt"}</small>
                      {canPay && <button type="button" className={styles.installmentPayButton} onClick={() => {
                        void loadWalletPreview(selectedDraft.id);
                        document.getElementById("sol-wallet-payment")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}>Peye mwa {item.installmentNumber} →</button>}
                      {!paid && !canPay && selectedDraft.status !== "cancelled" && <small className={styles.installmentHint}>Peye mwa anvan yo an premye.</small>}
                    </article>;
                  })}
                </div>
                <h3>Istwa tantativ peman</h3>
                <button className={styles.back} type="button" disabled={historyLoading} onClick={() => void loadPaymentHistory(selectedDraft.id)}>
                  {historyLoading ? "Ap chaje..." : "Gade istwa peman yo"}
                </button>
                {historyError && <p role="alert" className={styles.notice}>{historyError}</p>}
                {paymentHistory.length > 0 && <div className={styles.packageGrid}>
                  {paymentHistory.map(attempt => <article className={styles.package} key={attempt.id}>
                    <div className={styles.packageTop}><span>{attempt.method.toUpperCase()}</span><span className={styles.duration}>{attempt.status}</span></div>
                    <strong>{money(attempt.amountCents / 100)}</strong>
                    <small>{new Date(attempt.createdAt).toLocaleDateString("pt-BR")}</small>
                    <small>{attempt.confirmedAt ? "Konfime" : "Pa konfime"}</small>
                  </article>)}
                </div>}
                {historyLoaded && !historyLoading && !historyError && paymentHistory.length === 0 && <p className={styles.hint}>Pa gen tantativ peman ki chaje.</p>}
                <p className={styles.hint}>Pake bouyon an ap vin aktif sèlman apre premye peman an konfime, kit se ak balans Loto oswa PIX.</p>
              </>
            )}
          </section>
        )}

        {view === "transactions" && (
          <section className={styles.content}>
            <h2>Istwa tranzaksyon</h2>
            <button type="button" onClick={() => void loadTransactions()} disabled={transactionLoading}>{transactionLoading ? "Ap chaje..." : "Rafrechi tranzaksyon yo"}</button>
            {transactionError && <p role="alert" className={styles.hint}>{transactionError}</p>}
            {!transactionError && !transactionLoading && transactionPackages.flatMap((pkg) => (pkg.contributions ?? []).filter((contribution) => contribution.status === "paid" || Boolean(contribution.paidAt)).map((contribution) => ({ pkg, contribution }))).sort((a, b) => new Date(b.contribution.paidAt ?? 0).getTime() - new Date(a.contribution.paidAt ?? 0).getTime()).map(({ pkg, contribution }) => (
              <article className={styles.package} key={pkg.id + "-" + contribution.id}>
                <div className={styles.packageTop}><strong>Peman Sòl konfime</strong><span className={styles.duration}>Mwa {contribution.installmentNumber}/12</span></div>
                <strong>{money(contribution.amountCents / 100)}</strong>
                <small>{contribution.paidAt ? new Date(contribution.paidAt).toLocaleDateString("pt-BR") : "Konfime"}</small>
                <button type="button" onClick={() => void showSavedDraft(pkg.id)}>Gade detay pake a</button>
              </article>
            ))}
            {!transactionError && !transactionLoading && !transactionPackages.some((pkg) => (pkg.contributions ?? []).some((contribution) => contribution.status === "paid" || Boolean(contribution.paidAt))) && <div className={styles.empty}><span>📋</span><strong>Pa gen peman konfime ankò</strong><p>Lè ou peye yon mwa Sòl, l ap parèt isit la.</p></div>}
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
            <button key={id} className={(view === id || ((view === "details" || view === "saved") && id === "packages")) ? styles.activeTab : ""} aria-current={(view === id || (view === "details" && id === "packages")) ? "page" : undefined} onClick={() => go(id)}><span>{symbol}</span>{label}</button>
          ))}
        </nav>
      </div>
    </main>
  );
}
