import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, ArrowLeftRight, History, LogOut, Landmark, CreditCard, Percent, TrendingUp, Gift,
  Settings as SettingsIcon, ArrowDownLeft, ArrowUpRight, Wallet, ShieldCheck, KeyRound, Plus,
  PlusCircle, Send, Repeat, UserCog,
} from "lucide-react";
import { bank, logout } from "./api";
import { inr, errMsg } from "./ui";
import BankCard from "./BankCard";
import AccountList from "./AccountList";
import PayForm from "./PayForm";
import AccountsCards from "./Cards";
import Loans from "./Loans";
import Investments from "./Investments";
import Offers, { OfferMarquee } from "./Offers";
import Settings from "./Settings";
import KycPage from "./KycPage";
import TxnTable from "./TxnTable";

const TABS = [
  ["overview", "Overview", LayoutDashboard],
  ["accounts", "Accounts & Cards", CreditCard],
  ["pay", "Pay & Transfer", ArrowLeftRight],
  ["history", "Transactions", History],
  ["loans", "Loans", Percent],
  ["invest", "Investments", TrendingUp],
  ["offers", "Offers", Gift],
  ["kyc", "KYC", ShieldCheck],
  ["settings", "Settings", SettingsIcon],
];
const TITLES = {
  overview: "Here's what's happening with your money.",
  accounts: "Manage your accounts and request cards.",
  pay: "Enter an amount, then confirm with your PIN.",
  history: "Every credit and debit across all your accounts.",
  loans: "Apply for a loan and plan your EMI.",
  invest: "Gold, silver, platinum and mutual funds.",
  offers: "Deals and promo codes just for you.",
  kyc: "Verify your identity to start banking.",
  pin: "Set, change or reset your transaction PIN.",
  settings: "Profile, security and account settings.",
};
const GATED = ["overview", "accounts", "pay", "history", "invest"];
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [txns, setTxns] = useState([]);
  const [st, setSt] = useState({ kyc: "NOT_STARTED", hasPin: false });
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("overview");
  const [payMode, setPayMode] = useState("deposit");
  const [settingsSec, setSettingsSec] = useState("profile");
  const [sel, setSel] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [toast, setToast] = useState(null);
  const [initFailed, setInitFailed] = useState(false);
  const initRef = useRef(false);
  const jumpRef = useRef(false);
  const username = sessionStorage.getItem("username") || "User";
  const approved = st.kyc === "APPROVED";

  const go = (k) => {
    if (k === "pay") setPayMode("deposit");
    if (k === "settings") setSettingsSec("profile");
    setTab(k);
  };
  const goPin = () => { setSettingsSec("pin"); setTab("settings"); };

  const load = async () => {
    try {
      const [a, t, c, s] = await Promise.all([
        bank.get("/accounts"), bank.get("/transactions"), bank.get("/cards"), bank.get("/status"),
      ]);
      setAccounts(a.data); setTxns(t.data); setCards(c.data); setSt(s.data); setErr("");
    } catch (e) {
      if (e.response?.status === 401) logout();
      else setErr("Cannot reach the Banking Service. Is it running on port 8082?");
    } finally { setLoaded(true); }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const flash = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3200);
  };

  const activate = async () => {
    try {
      const { data } = await bank.post("/accounts/init");
      setSel(data.account.accountNumber);
      setInitFailed(false);
      flash("ok", "Your primary Savings account is ready");
      load();
    } catch (e) { setInitFailed(true); flash("err", errMsg(e, "Could not set up your account")); }
  };

  useEffect(() => {
    if (loaded && approved && accounts.length === 0 && !err && !initRef.current) { initRef.current = true; activate(); }
  }, [loaded, approved, accounts.length, err]);

  useEffect(() => {
    if (loaded && approved && !st.hasPin && !jumpRef.current) { jumpRef.current = true; goPin(); }
  }, [loaded, approved, st.hasPin]);

  const current = accounts.find((a) => a.accountNumber === sel) || accounts[0];
  const { totalIn, totalOut, totalBal } = useMemo(() => {
    let i = 0, o = 0;
    txns.forEach((t) => (t.type === "CREDIT" ? (i += Number(t.amount)) : (o += Number(t.amount))));
    return { totalIn: i, totalOut: o, totalBal: accounts.reduce((s, a) => s + Number(a.balance), 0) };
  }, [txns, accounts]);

  const shown = filter === "ALL" ? txns : txns.filter((t) => t.accountNumber === filter);
  const cardOf = current && cards.find((c) => c.accountNumber === current.accountNumber);
  const displayName = st.fullName || username.split("@")[0];
  const gated = GATED.includes(tab);
  const ready = loaded && gated && approved && accounts.length > 0;

  const QUICK = [
    ["Deposit", PlusCircle, "b", () => { setPayMode("deposit"); setTab("pay"); }],
    ["Transfer", Send, "g", () => { setPayMode("transfer"); setTab("pay"); }],
    ["Self transfer", Repeat, "b", () => { setPayMode("self"); setTab("pay"); }],
    ["Request new card", CreditCard, "r", () => setTab("accounts")],
    ["Update profile", UserCog, "g", () => { setSettingsSec("details"); setTab("settings"); }],
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-logo"><Landmark size={20} /></div> NovaBank</div>
        <nav className="nav">
          {TABS.map(([k, label, Icon]) => (
            <button key={k} className={tab === k ? "active" : ""} onClick={() => go(k)}><Icon size={19} /> {label}</button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="avatar">{displayName[0].toUpperCase()}</div>
            <div><b>{displayName.split(" ")[0]}</b><small>{approved ? "KYC verified" : "KYC pending"}</small></div>
          </div>
          <button className="logout" onClick={logout}><LogOut size={18} /> Logout</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h2>{tab === "overview" ? `${greeting()}, ${displayName.split(" ")[0]} 👋` : TABS.find((t) => t[0] === tab)[1]}</h2>
            <p>{TITLES[tab]}</p>
          </div>
        </div>

        {err && <div className="alert err">{err}</div>}
        {!loaded && <div className="empty">Loading your accounts...</div>}

        {loaded && approved && !st.hasPin && tab !== "settings" && (
          <div className="banner warn">
            Set your transaction PIN to start making transactions.
            <button className="btn sm" onClick={goPin}>Set PIN</button>
          </div>
        )}

        {loaded && gated && !approved && (
          <div className="card open">
            <div className="big"><ShieldCheck size={32} /></div>
            <h2>{st.kyc === "PENDING" ? "KYC under review" : st.kyc === "REJECTED" ? "KYC rejected" : "Complete your KYC"}</h2>
            <p>
              {st.kyc === "PENDING" ? "An admin is reviewing your details. This page updates automatically once you're approved."
                : st.kyc === "REJECTED" ? `Reason: ${st.kycReason}. Please correct your details and submit again.`
                : "KYC is mandatory before you can open an account or make any transaction."}
            </p>
            <button className="btn" onClick={() => setTab("kyc")}>{st.kyc === "PENDING" ? "View status" : "Go to KYC"}</button>
          </div>
        )}

        {loaded && gated && approved && accounts.length === 0 && (
          <div className="card open">
            <div className="big"><Wallet size={32} /></div>
            <h2>{initFailed ? "Couldn't set up your account" : "Setting up your primary account…"}</h2>
            <p>We're opening your Savings account and issuing a debit card.</p>
            {initFailed && <button className="btn" onClick={activate}><Plus size={18} /> Try again</button>}
          </div>
        )}

        {ready && tab === "overview" && current && (
          <>
            <AccountList accounts={accounts} current={current} onSelect={setSel} />
            <div className="hero">
              <BankCard number={current.accountNumber} holder={displayName.toUpperCase()} network={cardOf?.network || "VISA"}
                label={`${current.type[0] + current.type.slice(1).toLowerCase()} account`} balance={current.balance}
                theme={current.type === "MERCHANT" ? "green" : "blue"} />
              <div className="stats">
                <div className="stat"><div className="ic b"><Wallet size={20} /></div><small>Total balance</small><h3>{inr(totalBal)}</h3></div>
                <div className="stat"><div className="ic g"><ArrowDownLeft size={20} /></div><small>Total credited</small><h3>{inr(totalIn)}</h3></div>
                <div className="stat"><div className="ic r"><ArrowUpRight size={20} /></div><small>Total debited</small><h3>{inr(totalOut)}</h3></div>
                <div className="stat"><div className="ic b"><History size={20} /></div><small>Transactions</small><h3>{txns.length}</h3></div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-head"><h3>Quick actions</h3></div>
              <div className="quick">
                {QUICK.map(([label, Icon, tone, onClick]) => (
                  <button key={label} className="qtile" onClick={onClick}>
                    <span className={`ic ${tone}`}><Icon size={22} /></span>{label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Offers for you</h3>
                <button className="btn ghost" style={{ padding: "7px 14px" }} onClick={() => setTab("offers")}>See all offers</button>
              </div>
              <OfferMarquee />
            </div>
          </>
        )}

        {ready && tab === "accounts" && (
          <AccountsCards accounts={accounts} cards={cards} holder={displayName.toUpperCase()} reload={load} flash={flash} />
        )}

        {ready && tab === "pay" && (
          <div className="cols">
            <div className="card">
              <div className="card-head"><h3>New transaction</h3></div>
              <PayForm key={payMode} initialMode={payMode} accounts={accounts} selected={current?.accountNumber}
                onDone={load} flash={flash} onForgotPin={goPin} />
            </div>
            <div className="card">
              <div className="card-head"><h3>Your accounts</h3></div>
              {accounts.map((a) => (
                <div className="tx" key={a.accountNumber}>
                  <div className="tx-info"><b>{a.type[0] + a.type.slice(1).toLowerCase()}</b><small>{a.accountNumber}</small></div>
                  <div className="tx-amt">{inr(a.balance)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ready && tab === "history" && (
          <div className="card">
            <div className="card-head">
              <h3>All transactions</h3>
              <select className="in" style={{ width: 230 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="ALL">All accounts</option>
                {accounts.map((a) => <option key={a.accountNumber} value={a.accountNumber}>{a.type} • {a.accountNumber}</option>)}
              </select>
            </div>
            <TxnTable txns={shown} showAccount />
          </div>
        )}

        {ready && tab === "invest" && <Investments accounts={accounts} reload={load} flash={flash} onResendPin={goPin} />}

        {loaded && tab === "loans" && <Loans accounts={accounts} flash={flash} />}
        {loaded && tab === "offers" && <Offers go={go} />}
        {loaded && tab === "kyc" && <KycPage st={st} reload={load} flash={flash} />}
        {loaded && tab === "settings" && (
          <Settings key={settingsSec} username={username} initialSec={settingsSec} flash={flash} st={st} reload={load} />
        )}
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
    </div>
  );
}