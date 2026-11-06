import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { inr, spaced } from "./ui";

export function NetworkLogo({ network }) {
  if (network === "MASTERCARD") return <span className="net mc"><i /><i /></span>;
  if (network === "RUPAY") return <span className="net rupay">RuPay</span>;
  return <span className="net visa">VISA</span>;
}

export default function BankCard({ number, holder, expiry, network = "VISA", label, balance, theme = "blue", blocked, cvv, onShowCvv }) {
  const [hide, setHide] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`bankcard ${theme} ${blocked ? "blocked" : ""}`}>
      <div className="bc-top"><span>NOVABANK</span><NetworkLogo network={network} /></div>
      <div className="chip" />
      {balance !== undefined && (
        <div className="bc-bal">
          <small>Available balance</small>
          <div className="bc-line">
            <h1>{hide ? "₹ ••••••" : inr(balance)}</h1>
            <button onClick={() => setHide(!hide)}>{hide ? <Eye size={16} /> : <EyeOff size={16} />}</button>
          </div>
        </div>
      )}
      <div className="bc-line">
        <div className="bc-num">{spaced(number)}</div>
        <button onClick={copy} title="Copy number">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
      </div>
      {onShowCvv && (
      <div className="bc-line meta" style={{ marginTop: 0 }}>
        <span>CVV {cvv || "•••"}</span>
        {!cvv && <button onClick={onShowCvv} title="Show CVV (PIN needed)"><Eye size={14} /></button>}
      </div>
    )}
      <div className="bc-line meta">
        <span>{holder}{expiry && ` • ${expiry}`}</span>
        <span>{label}</span>
      </div>
      {blocked && <div className="blocked-tag">BLOCKED</div>}
    </div>
  );
}