import { useState } from "react";
import { bank } from "./api";
import { PinModal, TYPE_LABEL, inr } from "./ui";

const LABEL = { deposit: "Deposit", transfer: "Transfer", self: "Self transfer" };

export default function PayForm({ accounts, selected, onDone, flash, onForgotPin, initialMode = "deposit" }) {
  const [mode, setMode] = useState(initialMode);
  const [fromSel, setFromSel] = useState("");
  const [toSel, setToSel] = useState("");
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [ask, setAsk] = useState(false);

  const from = accounts.some((a) => a.accountNumber === fromSel) ? fromSel : selected || accounts[0]?.accountNumber;
  const others = accounts.filter((a) => a.accountNumber !== from);
  const self = others.some((a) => a.accountNumber === toSel) ? toSel : others[0]?.accountNumber;
  const target = mode === "self" ? self : to.trim();
  const selfAcc = accounts.find((a) => a.accountNumber === self);

  const validate = (e) => {
    e.preventDefault();
    if (mode === "self" && !target) return flash("err", "Open a second account to transfer between your own accounts");
    if (!amount || Number(amount) <= 0) return flash("err", "Enter a valid amount");
    if (mode === "transfer" && !target) return flash("err", "Enter recipient account number");
    setAsk(true);
  };

  const confirm = async (pin) => {
    if (mode === "deposit") await bank.post("/accounts/deposit", { accountNumber: from, amount, pin });
    else await bank.post("/accounts/transfer", { fromAccount: from, toAccount: target, amount, pin });
    flash("ok", mode === "deposit" ? "Money deposited" : "Transfer successful");
    setAmount(""); setTo(""); setAsk(false);
    onDone();
  };

  const detail = mode === "deposit" ? `Deposit ${inr(amount)}`
    : mode === "self" ? `Move ${inr(amount)} to your ${selfAcc ? TYPE_LABEL[selfAcc.type] : ""} account ••${(target || "").slice(-4)}`
    : `Transfer ${inr(amount)} to ${target}`;

  return (
    <>
      <form onSubmit={validate}>
        <div className="seg">
          {Object.keys(LABEL).map((m) => (
            <button type="button" key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{LABEL[m]}</button>
          ))}
        </div>

        {mode === "self" && others.length === 0 && (
          <div className="banner warn">You need at least two accounts for a self transfer. Open another one in Accounts &amp; Cards.</div>
        )}

        <div className="field">
          <label className="lbl">{mode === "deposit" ? "Deposit to" : "From account"}</label>
          <select className="in" value={from} onChange={(e) => setFromSel(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.accountNumber} value={a.accountNumber}>
                {TYPE_LABEL[a.type]} • {a.accountNumber} • ₹{Number(a.balance).toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        </div>

        {mode === "self" && others.length > 0 && (
          <div className="field">
            <label className="lbl">To my account</label>
            <select className="in" value={self} onChange={(e) => setToSel(e.target.value)}>
              {others.map((a) => (
                <option key={a.accountNumber} value={a.accountNumber}>{TYPE_LABEL[a.type]} • {a.accountNumber}</option>
              ))}
            </select>
          </div>
        )}

        {mode === "transfer" && (
          <div className="field">
            <label className="lbl">Recipient account number</label>
            <input className="in" value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. AC1234567890" />
          </div>
        )}

        <div className="field">
          <label className="lbl">Amount</label>
          <div className="input-wrap amt">
            <span className="rupee">₹</span>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div className="chips">
          {[500, 1000, 5000, 10000].map((v) => (
            <button type="button" key={v} onClick={() => setAmount(String(v))}>₹{v.toLocaleString("en-IN")}</button>
          ))}
        </div>

        <button className="btn full" style={{ padding: 14 }}>Continue</button>
      </form>

      {ask && <PinModal title="Confirm with your PIN" detail={detail} onSubmit={confirm} onClose={() => setAsk(false)} onForgot={onForgotPin} />}
    </>
  );
}