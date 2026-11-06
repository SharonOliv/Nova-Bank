import { useState } from "react";
import { Plus, Lock, Unlock } from "lucide-react";
import { bank } from "./api";
import BankCard from "./BankCard";
import useMyRequests from "./useMyRequests";
import { inr, TYPE_LABEL, errMsg, RequestList, PinModal } from "./ui";

const REASONS = { LOST: "Card lost", EXPIRED: "Card expired", NEW: "New card" };
const CARD = { DEBIT: "Debit", CREDIT: "Credit", PREPAID: "Prepaid" };

export default function AccountsCards({ accounts, cards, holder, reload, flash }) {
  const [accType, setAccType] = useState("SAVINGS");
  const [cAcc, setCAcc] = useState("");
  const [cType, setCType] = useState("DEBIT");
  const [reason, setReason] = useState("");
  const [askFor, setAskFor] = useState(null);
  const [cvvs, setCvvs] = useState({});
  const [reqs, loadReqs] = useMyRequests();
  const acct = (n) => accounts.find((a) => a.accountNumber === n);
  const target = acct(cAcc) ? cAcc : accounts[0]?.accountNumber;

  const requestAccount = async () => {
    try {
      await bank.post("/requests/account", { type: accType });
      flash("ok", "Account request sent. It opens, with a debit card, after admin approval");
      loadReqs();
    } catch (e) { flash("err", errMsg(e)); }
  };

  const requestCard = async () => {
    if (cType === "DEBIT" && !reason) return flash("err", "Select why you need a debit card");
    try {
      await bank.post("/requests/card", { accountNumber: target, type: cType, reason: cType === "DEBIT" ? reason : undefined });
      flash("ok", "Card request sent for approval");
      setReason(""); loadReqs();
    } catch (e) { flash("err", errMsg(e)); }
  };

  const toggle = async (id) => {
    try { await bank.post(`/cards/${id}/toggle`); reload(); }
    catch (e) { flash("err", errMsg(e)); }
  };

  const showCvv = async (pin) => {
    const id = askFor;
    const { data } = await bank.post(`/cards/${id}/cvv`, { pin });
    setCvvs((m) => ({ ...m, [id]: data.cvv }));
    setAskFor(null);
    setTimeout(() => setCvvs((m) => { const n = { ...m }; delete n[id]; return n; }), 15000);
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head"><h3>Your accounts</h3><span className="muted">{accounts.length} of 5</span></div>
        <div className="grid3">
          {accounts.map((a) => (
            <div className="tile" key={a.accountNumber}>
              <span className={`pill ${a.type === "MERCHANT" ? "green" : ""}`}>{TYPE_LABEL[a.type]}</span>
              <b>{inr(a.balance)}</b>
              <p className="muted" style={{ marginTop: 6 }}>{a.accountNumber}</p>
            </div>
          ))}
        </div>

        <h3 style={{ margin: "24px 0 10px", fontSize: 15 }}>Request a new account</h3>
        <div className="row">
          <select className="in" style={{ width: 180 }} value={accType} onChange={(e) => setAccType(e.target.value)}>
            <option value="SAVINGS">Savings</option>
            <option value="CURRENT">Current</option>
            <option value="MERCHANT">Merchant</option>
          </select>
          <button className="btn" onClick={requestAccount}><Plus size={16} /> Request account</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <RequestList items={reqs.filter((r) => r.kind === "ACCOUNT")} empty="No account requests yet."
            describe={(r) => `${TYPE_LABEL[r.data.type]} account`} />
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Your cards</h3><span className="muted">{cards.length} cards</span></div>
        {cards.length === 0 ? <div className="empty">No cards yet. Request one below.</div> : (
          <div className="grid2">
            {cards.map((c) => (
              <div key={c.id}>
                <BankCard number={c.cardNumber} holder={holder} expiry={c.expiry} network={c.network}
                  label={`${CARD[c.type]} • ${TYPE_LABEL[acct(c.accountNumber)?.type] || ""}`} blocked={c.blocked}
                  cvv={cvvs[c.id]} onShowCvv={c.replaced ? undefined : () => setAskFor(c.id)}
                  theme={c.type === "CREDIT" ? "dark" : c.type === "PREPAID" ? "green" : "blue"} />
                <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
                  <span className="muted">Linked: ••{c.accountNumber.slice(-4)}</span>
                  {c.replaced ? <span className="pill amber">Replaced</span> : (
                    <button className="btn ghost" style={{ padding: "7px 14px" }} onClick={() => toggle(c.id)}>
                      {c.blocked ? <><Unlock size={15} /> Unblock</> : <><Lock size={15} /> Block</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h3>Request a card</h3><span className="muted">Issued after admin approval</span></div>
        <div className="grid3">
          <div><label className="lbl">Card type</label>
            <select className="in" value={cType} onChange={(e) => setCType(e.target.value)}>
              <option value="DEBIT">Debit card</option><option value="CREDIT">Credit card</option><option value="PREPAID">Prepaid card</option>
            </select></div>
          <div><label className="lbl">Link to account</label>
            <select className="in" value={target} onChange={(e) => setCAcc(e.target.value)}>
              {accounts.map((a) => <option key={a.accountNumber} value={a.accountNumber}>{TYPE_LABEL[a.type]} • ••{a.accountNumber.slice(-4)}</option>)}
            </select></div>
          {cType === "DEBIT" && (
            <div><label className="lbl">Reason <span className="req">*</span></label>
              <select className="in" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Select a reason</option>
                {Object.entries(REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select></div>
          )}
        </div>
        {cType === "DEBIT" && <p className="muted" style={{ marginTop: 10 }}>When approved, your current debit card on this account is blocked permanently.</p>}
        <button className="btn" style={{ marginTop: 16 }} onClick={requestCard}><Plus size={16} /> Request card</button>

        <h3 style={{ margin: "26px 0 8px", fontSize: 15 }}>My card requests</h3>
        <RequestList items={reqs.filter((r) => r.kind === "CARD")} empty="No card requests yet."
          describe={(r) => `${CARD[r.data.type]} card • ••${r.data.accountNumber.slice(-4)}${r.data.reason ? " • " + REASONS[r.data.reason] : ""}`} />
      </div>

      {askFor && <PinModal title="Enter PIN to view CVV" detail="The CVV is shown for 15 seconds." onSubmit={showCvv} onClose={() => setAskFor(null)} />}
    </div>
  );
}