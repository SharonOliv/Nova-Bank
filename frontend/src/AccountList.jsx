import { useState } from "react";
import { Wallet, Landmark, Briefcase, Star } from "lucide-react";
import { inr, TYPE_LABEL } from "./ui";

const ICON = { SAVINGS: Wallet, CURRENT: Landmark, MERCHANT: Briefcase };

export default function AccountList({ accounts, current, onSelect }) {
  const [shown, setShown] = useState({});
  return (
    <div className="card acct-list">
      <div className="card-head"><h3>My accounts</h3><span className="muted">{accounts.length} linked</span></div>
      {accounts.map((a) => {
        const Icon = ICON[a.type] || Wallet;
        const n = a.accountNumber;
        return (
          <div key={n} className={`acct-row ${current?.accountNumber === n ? "on" : ""}`} onClick={() => onSelect(n)}>
            <div className="ic b"><Icon size={20} /></div>
            <div className="tx-info">
              <b>{TYPE_LABEL[a.type]} account {a.primaryAccount && <span className="pill amber"><Star size={10} /> PRIMARY</span>}</b>
              <small>A/c ••{n.slice(-4)}</small>
            </div>
            {shown[n]
              ? <b>{inr(a.balance)}</b>
              : <button className="link" onClick={(e) => { e.stopPropagation(); setShown({ ...shown, [n]: true }); }}>View balance</button>}
          </div>
        );
      })}
    </div>
  );
}