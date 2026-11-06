import { useState } from "react";
import { Car, Building2, User, Coins, GraduationCap, Briefcase } from "lucide-react";
import { bank } from "./api";
import useMyRequests from "./useMyRequests";
import { inr, errMsg, TYPE_LABEL, Modal, RequestList } from "./ui";

const LOANS = [
  { key: "CAR", name: "Car Loan", icon: Car, c: "b", rate: 8.75, maxAmt: 15000000, maxMonths: 84, desc: "Drive home your dream car with up to 100% on-road funding." },
  { key: "HOME", name: "Home Loan", icon: Building2, c: "g", rate: 8.35, maxAmt: 100000000, maxMonths: 360, desc: "Buy, build or renovate with long tenures and low EMIs." },
  { key: "PERSONAL", name: "Personal Loan", icon: User, c: "r", rate: 10.99, maxAmt: 2500000, maxMonths: 60, desc: "Collateral-free funds for weddings, travel or emergencies." },
  { key: "GOLD", name: "Gold Loan", icon: Coins, c: "b", rate: 9.0, maxAmt: 10000000, maxMonths: 36, desc: "Instant money against your gold ornaments." },
  { key: "EDUCATION", name: "Education Loan", icon: GraduationCap, c: "g", rate: 9.5, maxAmt: 7500000, maxMonths: 180, desc: "Fund studies in India or abroad; repay after you graduate." },
  { key: "BUSINESS", name: "Business Loan", icon: Briefcase, c: "r", rate: 11.5, maxAmt: 50000000, maxMonths: 120, desc: "Working capital and expansion funds for merchants." },
];

const emiOf = (p, rate, n) => {
  const r = rate / 12 / 100;
  return r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

function EmiCalc() {
  const [p, setP] = useState(1000000);
  const [rate, setRate] = useState(9);
  const [yrs, setYrs] = useState(5);
  const n = yrs * 12;
  const emi = p > 0 && n > 0 ? emiOf(p, rate, n) : 0;
  return (
    <div className="card">
      <div className="card-head"><h3>EMI calculator</h3><span className="muted">Indicative only</span></div>
      <div className="grid3">
        <div><label className="lbl">Loan amount (₹)</label><input className="in" type="number" value={p} onChange={(e) => setP(Number(e.target.value))} /></div>
        <div><label className="lbl">Interest rate (% p.a.)</label><input className="in" type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></div>
        <div><label className="lbl">Tenure (years)</label><input className="in" type="number" value={yrs} onChange={(e) => setYrs(Number(e.target.value))} /></div>
      </div>
      {emi > 0 && (
        <div className="grid3" style={{ marginTop: 16 }}>
          <div className="tile"><small className="muted">Monthly EMI</small><b>{inr(emi)}</b></div>
          <div className="tile"><small className="muted">Total interest</small><b>{inr(emi * n - p)}</b></div>
          <div className="tile"><small className="muted">Total payable</small><b>{inr(emi * n)}</b></div>
        </div>
      )}
    </div>
  );
}

function ApplyModal({ loan, accounts, onClose, onDone, flash }) {
  const [acc, setAcc] = useState(accounts[0]?.accountNumber || "");
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState(Math.min(60, loan.maxMonths));
  const [busy, setBusy] = useState(false);
  const emi = Number(amount) > 0 && months > 0 ? emiOf(Number(amount), loan.rate, Number(months)) : 0;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await bank.post("/requests/loan", { accountNumber: acc, loanType: loan.key, amount, months: Number(months) });
      flash("ok", "Loan request sent for admin approval");
      onDone();
      onClose();
    } catch (ex) { flash("err", errMsg(ex)); setBusy(false); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} style={{ textAlign: "left" }}>
        <h2 style={{ textAlign: "center" }}>Apply for {loan.name}</h2>
        <p className="muted" style={{ textAlign: "center", margin: "6px 0 18px" }}>{loan.rate}% p.a. • up to {inr(loan.maxAmt)} • up to {loan.maxMonths} months</p>
        <div className="field"><label className="lbl">Credit to account</label>
          <select className="in" value={acc} onChange={(e) => setAcc(e.target.value)}>
            {accounts.map((a) => <option key={a.accountNumber} value={a.accountNumber}>{TYPE_LABEL[a.type]} • {a.accountNumber}</option>)}
          </select></div>
        <div className="field"><label className="lbl">Loan amount (₹10,000 minimum)</label>
          <input className="in" type="number" min="10000" max={loan.maxAmt} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="field"><label className="lbl">Tenure (months, 6 to {loan.maxMonths})</label>
          <input className="in" type="number" min="6" max={loan.maxMonths} value={months} onChange={(e) => setMonths(e.target.value)} /></div>
        {emi > 0 && <p className="muted" style={{ marginBottom: 14 }}>Estimated EMI: <b>{inr(emi)}</b> per month</p>}
        <button className="btn full" disabled={busy} style={{ padding: 14 }}>{busy ? "Sending..." : "Submit request"}</button>
        <div style={{ textAlign: "center", marginTop: 12 }}><button type="button" className="link" onClick={onClose}>Cancel</button></div>
      </form>
    </Modal>
  );
}

export default function Loans({ accounts, flash }) {
  const [apply, setApply] = useState(null);
  const [reqs, load] = useMyRequests();
  const canApply = accounts.length > 0;
  return (
    <div className="stack">
      {!canApply && <div className="banner warn">Complete your KYC to apply for a loan.</div>}
      <div className="grid3">
        {LOANS.map((l) => {
          const Icon = l.icon;
          return (
            <div className="card loan" key={l.key}>
              <div className={`ic ${l.c}`}><Icon size={24} /></div>
              <div><h3>{l.name}</h3><p className="muted" style={{ marginTop: 4 }}>{l.desc}</p></div>
              <div className="kv">
                <div><small>Interest from</small><b>{l.rate}% p.a.</b></div>
                <div><small>Up to</small><b>{inr(l.maxAmt).replace(".00", "")}</b></div>
                <div><small>Tenure</small><b>Up to {l.maxMonths} months</b></div>
              </div>
              <button className="btn full" disabled={!canApply} onClick={() => setApply(l)}>Apply now</button>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-head"><h3>My loan requests</h3><span className="muted">Approved loans are credited to your account</span></div>
        <RequestList items={reqs.filter((r) => r.kind === "LOAN")} empty="No loan requests yet."
          describe={(r) => `${r.data.loanType} loan • ${inr(r.data.amount)} • ${r.data.months} months`} />
      </div>

      <EmiCalc />
      <p className="muted">Rates and limits are indicative and subject to bank approval.</p>
      {apply && <ApplyModal loan={apply} accounts={accounts} onClose={() => setApply(null)} onDone={load} flash={flash} />}
    </div>
  );
}