import { useState } from "react";
import { bank } from "./api";
import { PinField, errMsg } from "./ui";

export default function PinPage({ st, reload, flash }) {
  const approved = st.kyc === "APPROVED";
  const [tab, setTab] = useState("change");
  const [oldPin, setOldPin] = useState("");
  const [np, setNp] = useState("");
  const [cp, setCp] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const email = sessionStorage.getItem("username");

  const clear = () => { setOldPin(""); setNp(""); setCp(""); setCode(""); setSent(false); };

  const run = async (fn, okMsg) => {
    if (np.length !== 4) return flash("err", "New PIN must be 4 digits");
    if (np !== cp) return flash("err", "PINs do not match");
    setBusy(true);
    try { await fn(); flash("ok", okMsg); clear(); reload(); }
    catch (ex) { flash("err", errMsg(ex)); }
    finally { setBusy(false); }
  };

  const sendCode = async () => {
    setBusy(true);
    try { await bank.post("/pin/reset/request"); setSent(true); flash("ok", "Code sent to " + email); }
    catch (ex) { flash("err", errMsg(ex)); }
    finally { setBusy(false); }
  };

  if (!approved)
    return <div className="banner warn" style={{ maxWidth: 640 }}>Complete and get your KYC approved before setting a PIN.</div>;

  if (!st.hasPin)
    return (
      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-head"><h3>Set your transaction PIN</h3></div>
        <p className="muted" style={{ marginBottom: 16 }}>Choose a 4-digit PIN. You'll enter it to confirm every transaction. Avoid repeated or sequential digits.</p>
        <PinField label="New PIN" value={np} onChange={setNp} />
        <PinField label="Confirm PIN" value={cp} onChange={setCp} />
        <button className="btn" disabled={busy} onClick={() => run(() => bank.post("/pin/set", { pin: np }), "PIN set successfully")}>Set PIN</button>
      </div>
    );

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <div className="tabs">
        <button className={tab === "change" ? "on" : ""} onClick={() => { setTab("change"); clear(); }}>Change PIN</button>
        <button className={tab === "forgot" ? "on" : ""} onClick={() => { setTab("forgot"); clear(); }}>Forgot PIN</button>
      </div>

      {tab === "change" ? (
        <>
          <PinField label="Current PIN" value={oldPin} onChange={setOldPin} />
          <PinField label="New PIN" value={np} onChange={setNp} />
          <PinField label="Confirm new PIN" value={cp} onChange={setCp} />
          <button className="btn" disabled={busy || oldPin.length !== 4}
            onClick={() => run(() => bank.post("/pin/change", { oldPin, newPin: np }), "PIN changed")}>Change PIN</button>
        </>
      ) : !sent ? (
        <>
          <p className="muted" style={{ marginBottom: 16 }}>We'll email a 6-digit code to <b>{email}</b>. Use it to set a new PIN. This also unlocks a locked PIN.</p>
          <button className="btn" disabled={busy} onClick={sendCode}>{busy ? "Sending..." : "Send code"}</button>
        </>
      ) : (
        <>
          <PinField label="6-digit email code" value={code} onChange={setCode} length={6} visible />
          <PinField label="New PIN" value={np} onChange={setNp} />
          <PinField label="Confirm new PIN" value={cp} onChange={setCp} />
          <button className="btn" disabled={busy || code.length !== 6}
            onClick={() => run(() => bank.post("/pin/reset/confirm", { code, newPin: np }), "PIN reset successfully")}>Reset PIN</button>
          <button className="link" style={{ marginLeft: 14 }} onClick={() => setSent(false)}>Resend code</button>
        </>
      )}
    </div>
  );
}