import { useState } from "react";

export const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const spaced = (s = "") => s.replace(/(.{4})/g, "$1 ").trim();
export const when = (ts) => new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
export const TYPE_LABEL = { SAVINGS: "Savings", CURRENT: "Current", MERCHANT: "Merchant" };
export const errMsg = (e, fb = "Something went wrong") =>
  e.response?.data?.message || (e.request ? "Cannot reach server" : fb);

export function PinField({ value, onChange, label = "Transaction PIN", length = 4, visible = false }) {
  return (
    <div className="field">
      <label className="lbl">{label}</label>
      <input className="in pin" type={visible ? "text" : "password"} inputMode="numeric" autoComplete="off"
        maxLength={length} placeholder={"•".repeat(length)} value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} />
    </div>
  );
}

export function Modal({ children, onClose }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/** Asks for the PIN after the amount is entered. onSubmit(pin) must throw on failure. */
export function PinModal({ title = "Enter your PIN", detail, onSubmit, onClose, onForgot }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) return setErr("Enter your 4-digit PIN");
    setBusy(true); setErr("");
    try { await onSubmit(pin); }
    catch (ex) { setErr(errMsg(ex, "Transaction failed")); setPin(""); setBusy(false); }
  };

  return (
    <Modal onClose={busy ? () => {} : onClose}>
      <form onSubmit={go}>
        <h2>{title}</h2>
        {detail && <p className="muted" style={{ marginTop: 6 }}>{detail}</p>}
        <input className="in pin" style={{ margin: "20px 0 12px" }} type="password" inputMode="numeric"
          autoComplete="off" autoFocus maxLength={4} placeholder="••••" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        {err && <div className="alert err">{err}</div>}
        <button className="btn full" disabled={busy} style={{ padding: 14 }}>{busy ? "Verifying..." : "Confirm"}</button>
        <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
          <button type="button" className="link" onClick={onClose}>Cancel</button>
          {onForgot && <button type="button" className="link" onClick={() => { onClose(); onForgot(); }}>Forgot PIN?</button>}
        </div>
      </form>
    </Modal>
  );
}

export function RequestList({ items, describe, empty = "No requests yet." }) {
  if (!items.length) return <div className="empty">{empty}</div>;
  return items.map((r) => (
    <div className="tx" key={r.id}>
      <div className="tx-info">
        <b>{describe(r)}</b>
        <small>{when(r.createdAt)}{r.note ? ` • ${r.note}` : ""}</small>
      </div>
      <span className={`badge ${r.status === "APPROVED" ? "cr" : r.status === "REJECTED" ? "dr" : "pend"}`}>{r.status}</span>
    </div>
  ));
}