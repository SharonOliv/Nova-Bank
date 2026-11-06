import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, ShieldCheck, FileEdit, Percent, CreditCard, Trash2, Users, Wallet, History,
  LogOut, Landmark, Check, X,
} from "lucide-react";
import { auth, bank, logout } from "./api";
import { inr, errMsg, when, TYPE_LABEL } from "./ui";
import TxnChart from "./TxnChart";
import TxnTable from "./TxnTable";

const badge = (s) => (s === "APPROVED" ? "cr" : s === "REJECTED" ? "dr" : "pend");
const Tag = ({ s }) => <span className={`badge ${badge(s)}`}>{s}</span>;

function Table({ head, rows, empty = "Nothing here yet." }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-scroll"><table>
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
  );
}

const Decide = ({ onApprove, onReject, yes = "Approve", no = "Reject" }) => (
  <div className="row">
    <button className="btn green sm" onClick={onApprove}><Check size={14} /> {yes}</button>
    <button className="btn red sm" onClick={onReject}><X size={14} /> {no}</button>
  </div>
);

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [txns, setTxns] = useState([]);
  const [kycs, setKycs] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const email = sessionStorage.getItem("username") || "admin";

  const flash = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    try { setUsers((await auth.get("/admin/users")).data); }
    catch (e) { if (e.response?.status === 401) return logout(); }
    try {
      const [a, t, k, r] = await Promise.all([
        bank.get("/admin/accounts"), bank.get("/admin/transactions"), bank.get("/admin/kyc"), bank.get("/admin/requests"),
      ]);
      setAccounts(a.data); setTxns(t.data); setKycs(k.data); setReqs(r.data);
    } catch (e) { if (e.response?.status === 401) logout(); }
  };

  useEffect(() => { load(); const id = setInterval(load, 6000); return () => clearInterval(id); }, []);

  const ask = (text, def) => window.prompt(text, def);

  const decideKyc = async (k, action) => {
    let body = {};
    if (action === "reject") {
      const reason = ask("Reason for rejection (shown to the user):", "Details could not be verified");
      if (reason === null) return;
      body = { reason };
    }
    try { await bank.post(`/admin/kyc/${k.id}/${action}`, body); flash("ok", `KYC ${action}d for ${k.username}`); load(); }
    catch (e) { flash("err", errMsg(e)); }
  };

  const decideReq = async (r, action) => {
    let body = {};
    if (action === "reject") {
      const note = ask("Reason (shown to the user):", "Not approved");
      if (note === null) return;
      body = { note };
    }
    try { await bank.post(`/admin/requests/${r.id}/${action}`, body); flash("ok", `Request ${action}d`); load(); }
    catch (e) { flash("err", errMsg(e)); }
  };

  const setUserStatus = async (u, action) => {
    try { await auth.post(`/admin/users/${u.id}/${action}`); load(); }
    catch (e) { flash("err", errMsg(e)); }
  };

  const approveDeletion = async (u) => {
    if (!window.confirm(`Permanently delete ${u.username} and all their data? This cannot be undone.`)) return;
    try {
      await bank.delete("/admin/users/data", { params: { username: u.username } });
      await auth.post(`/admin/users/${u.id}/delete`);
      flash("ok", `${u.username} deleted`);
      load();
    } catch (e) { flash("err", errMsg(e)); }
  };

  const of = (kind) => reqs.filter((r) => r.kind === kind);
  const pend = (list) => list.filter((r) => r.status === "PENDING");
  const pendKyc = kycs.filter((k) => k.status === "PENDING");
  const deact = users.filter((u) => u.status === "DEACTIVATED");
  const deposits = accounts.reduce((s, a) => s + Number(a.balance), 0);

  const NAV = useMemo(() => [
    ["overview", "Overview", LayoutDashboard, 0],
    ["kyc", "Approve users", ShieldCheck, pendKyc.length],
    ["details", "Approve details", FileEdit, pend(of("DETAILS")).length],
    ["loans", "Sanction loans", Percent, pend(of("LOAN")).length],
    ["cards", "Issue cards", CreditCard, pend(of("CARD")).length],
    ["openreq", "Open accounts", Wallet, pend(of("ACCOUNT")).length],
    ["deletions", "Deletions", Trash2, deact.length],
    ["users", "Users", Users, 0],
    ["accounts", "Accounts", Wallet, 0],
    ["txns", "Transactions", History, 0],
  ], [kycs, reqs, users]); // eslint-disable-line

  const title = NAV.find((n) => n[0] === tab)[1];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-logo"><Landmark size={20} /></div> NovaBank Admin</div>
        <nav className="nav">
          {NAV.map(([k, label, Icon, n]) => (
            <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
              <Icon size={19} /> {label} {n > 0 && <span className="nb">{n}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="avatar">A</div>
            <div><b>Admin</b><small>{email}</small></div>
          </div>
          <button className="logout" onClick={logout}><LogOut size={18} /> Logout</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar"><div><h2>{title}</h2></div></div>

        {tab === "overview" && (
          <div className="stack">
            <div className="grid3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="stat"><div className="ic b"><ShieldCheck size={20} /></div><small>Pending KYC</small><h3>{pendKyc.length}</h3></div>
              <div className="stat"><div className="ic g"><Users size={20} /></div><small>Total users</small><h3>{users.length}</h3></div>
              <div className="stat"><div className="ic b"><Wallet size={20} /></div><small>Accounts</small><h3>{accounts.length}</h3></div>
              <div className="stat"><div className="ic g"><Wallet size={20} /></div><small>Total deposits</small><h3>{inr(deposits)}</h3></div>
            </div>
            <div className="card"><div className="card-head"><h3>Bank-wide credits vs debits</h3></div><TxnChart txns={txns} /></div>
          </div>
        )}

        {tab === "kyc" && (
          <div className="card"><Table empty="No KYC submissions yet."
            head={["Email", "Name / DOB", "PAN", "Aadhaar", "Mobile", "Address", "Submitted", "Status", "Action"]}
            rows={kycs.map((k) => (
              <tr key={k.id}>
                <td><b>{k.username}</b></td>
                <td>{k.fullName}<br /><span className="muted">{k.dob}</span></td>
                <td>{k.pan}</td><td>•••• {k.aadhaarLast4}</td><td>{k.phone}</td>
                <td>{k.address}, {k.city} {k.pincode}</td>
                <td>{k.submittedAt ? when(k.submittedAt) : ""}</td>
                <td><Tag s={k.status} />{k.rejectReason && <><br /><span className="muted">{k.rejectReason}</span></>}</td>
                <td>{k.status === "PENDING" && <Decide onApprove={() => decideKyc(k, "approve")} onReject={() => decideKyc(k, "reject")} />}</td>
              </tr>
            ))} /></div>
        )}

        {tab === "details" && (
          <div className="card"><Table empty="No detail-change requests."
            head={["User", "Requested changes", "Reason", "Requested", "Status", "Action"]}
            rows={of("DETAILS").map((r) => (
              <tr key={r.id}>
                <td><b>{r.username}</b></td>
                <td>{Object.entries(r.data).filter(([k]) => k !== "reason").map(([k, v]) => <div key={k}><span className="muted">{k}:</span> <b>{v}</b></div>)}</td>
                <td>{r.data.reason}</td><td>{when(r.createdAt)}</td>
                <td><Tag s={r.status} />{r.note && <><br /><span className="muted">{r.note}</span></>}</td>
                <td>{r.status === "PENDING" && <Decide onApprove={() => decideReq(r, "approve")} onReject={() => decideReq(r, "reject")} />}</td>
              </tr>
            ))} /></div>
        )}

        {tab === "loans" && (
          <div className="card"><Table empty="No loan requests."
            head={["User", "Loan", "Amount", "Tenure", "Rate", "Credit to", "Requested", "Status", "Action"]}
            rows={of("LOAN").map((r) => (
              <tr key={r.id}>
                <td><b>{r.username}</b></td><td>{r.data.loanType}</td><td>{inr(r.data.amount)}</td>
                <td>{r.data.months} mo</td><td>{r.data.rate}%</td><td>{r.data.accountNumber}</td>
                <td>{when(r.createdAt)}</td>
                <td><Tag s={r.status} />{r.note && <><br /><span className="muted">{r.note}</span></>}</td>
                <td>{r.status === "PENDING" && <Decide yes="Sanction" onApprove={() => decideReq(r, "approve")} onReject={() => decideReq(r, "reject")} />}</td>
              </tr>
            ))} /></div>
        )}

        {tab === "cards" && (
          <div className="card"><Table empty="No card requests."
            head={["User", "Account", "Card", "Network", "Reason", "Requested", "Status", "Action"]}
            rows={of("CARD").map((r) => (
              <tr key={r.id}>
                <td><b>{r.username}</b></td><td>{r.data.accountNumber}</td><td>{r.data.type}</td>
                <td>{r.data.type === "CREDIT" ? "VISA" : r.data.type === "PREPAID" ? "MASTERCARD" : "RUPAY"}</td>
                <td>{r.data.reason || "-"}</td>
                <td>{when(r.createdAt)}</td>
                <td><Tag s={r.status} />{r.note && <><br /><span className="muted">{r.note}</span></>}</td>
                <td>{r.status === "PENDING" && <Decide yes="Issue" onApprove={() => decideReq(r, "approve")} onReject={() => decideReq(r, "reject")} />}</td>
              </tr>
            ))} /></div>
        )}

        {tab === "openreq" && (
          <div className="card"><Table empty="No account requests."
            head={["User", "Account type", "Requested", "Status", "Action"]}
            rows={of("ACCOUNT").map((r) => (
              <tr key={r.id}>
                <td><b>{r.username}</b></td><td>{TYPE_LABEL[r.data.type]}</td><td>{when(r.createdAt)}</td>
                <td><Tag s={r.status} />{r.note && <><br /><span className="muted">{r.note}</span></>}</td>
                <td>{r.status === "PENDING" && <Decide yes="Open account" onApprove={() => decideReq(r, "approve")} onReject={() => decideReq(r, "reject")} />}</td>
              </tr>
            ))} /></div>
        )}

        {tab === "deletions" && (
          <div className="card"><Table empty="No accounts waiting for deletion."
            head={["Email", "Deactivated", "Action"]}
            rows={deact.map((u) => (
              <tr key={u.id}>
                <td><b>{u.username}</b></td>
                <td>{u.deactivatedAt ? when(u.deactivatedAt) : ""}</td>
                <td><Decide yes="Delete permanently" no="Restore" onApprove={() => approveDeletion(u)} onReject={() => setUserStatus(u, "restore")} /></td>
              </tr>
            ))} /></div>
        )}

        {tab === "users" && (
          <div className="card"><Table
            head={["Email", "Role", "Status", "Action"]}
            rows={users.map((u) => (
              <tr key={u.id}>
                <td><b>{u.username}</b></td><td>{u.role}</td><td><Tag s={u.status} /></td>
                <td>{u.role !== "ADMIN" && u.status !== "DEACTIVATED" && (
                  u.status === "REJECTED"
                    ? <button className="btn green sm" onClick={() => setUserStatus(u, "approve")}>Unblock</button>
                    : <button className="btn red sm" onClick={() => setUserStatus(u, "reject")}>Block</button>
                )}</td>
              </tr>
            ))} /></div>
        )}

        {tab === "accounts" && (
          <div className="card"><Table
            head={["Account", "Owner", "Type", "Balance", "Created"]}
            rows={accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.accountNumber}</td>
                <td>{a.owner} {a.primaryAccount && <span className="pill amber">PRIMARY</span>}</td>
                <td>{TYPE_LABEL[a.type]}</td><td>{inr(a.balance)}</td>
                <td>{new Date(a.createdAt).toLocaleString("en-IN")}</td>
              </tr>
            ))} /></div>
        )}

        {tab === "txns" && <div className="card"><TxnTable txns={txns} showAccount /></div>}
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
    </div>
  );
}