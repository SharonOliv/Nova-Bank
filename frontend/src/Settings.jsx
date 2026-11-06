import { useEffect, useState } from "react";
import { auth, bank, logout } from "./api";
import useMyRequests from "./useMyRequests";
import { errMsg, RequestList } from "./ui";
import PinPage from "./PinPage";
import Faq from "./Faq";

const FIELDS = [["fullName", "Full name"], ["phone", "Mobile number"], ["address", "Address"], ["city", "City"], ["pincode", "Pincode"]];

export default function Settings({ username, flash, initialSec = "profile", st, reload }) {
  const [sec, setSec] = useState(initialSec);
  const [me, setMe] = useState(null);
  const [reqs, loadReqs] = useMyRequests();
  const [f, setF] = useState({ fullName: "", phone: "", address: "", city: "", pincode: "", reason: "" });
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [conf, setConf] = useState("");
  const [delPw, setDelPw] = useState("");
  const [delTxt, setDelTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const detailReqs = reqs.filter((r) => r.kind === "DETAILS");
  const pending = detailReqs.some((r) => r.status === "PENDING");
  const approvedCount = detailReqs.filter((r) => r.status === "APPROVED").length;

  // reload the profile whenever an admin approves a change
  useEffect(() => { bank.get("/me").then((r) => setMe(r.data)).catch(() => {}); }, [approvedCount]);
  useEffect(() => {
    if (me) setF((x) => ({ ...x, fullName: me.fullName || "", phone: me.phone || "", address: me.address || "", city: me.city || "", pincode: me.pincode || "" }));
  }, [me]);

  const requestChange = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await bank.post("/requests/details", f);
      flash("ok", "Update request sent for admin approval");
      setF((x) => ({ ...x, reason: "" }));
      loadReqs();
    } catch (ex) { flash("err", errMsg(ex)); }
    finally { setBusy(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) return flash("err", "New password must be at least 6 characters");
    if (newPw !== conf) return flash("err", "Passwords do not match");
    try {
      await auth.post("/auth/change-password", { username, oldPassword: oldPw, newPassword: newPw });
      flash("ok", "Password changed");
      setOldPw(""); setNewPw(""); setConf("");
    } catch (ex) { flash("err", errMsg(ex)); }
  };

  const del = async (e) => {
    e.preventDefault();
    if (delTxt !== "DELETE") return flash("err", "Type DELETE to confirm");
    setBusy(true);
    try {
      await auth.post("/auth/request-deletion", { username, password: delPw });
      setDone(true);
    } catch (ex) { flash("err", errMsg(ex)); setBusy(false); }
  };

  if (done)
    return (
      <div className="card open">
        <div className="big" style={{ background: "linear-gradient(135deg,#f59e0b,#dc2626)" }}>!</div>
        <h2>Account deactivated</h2>
        <p>Your account is deactivated for 2 days. It will be permanently deleted once the admin approves your request. To undo this, contact the bank before then.</p>
        <button className="btn" onClick={logout}>Back to login</button>
      </div>
    );

  return (
    <div className="card" style={{ maxWidth: 680 }}>
      <div className="tabs">
        {[["profile", "Profile"], ["details", "Update details"], ["security", "Security"], ["pin", "Forgot PIN"], ["faq", "FAQs"], ["danger", "Delete account"]].map(([k, l]) => (
          <button key={k} className={sec === k ? "on" : ""} onClick={() => setSec(k)}>{l}</button>
        ))}
      </div>

      {sec === "profile" && (
        <>
          <div className="field"><label className="lbl">Full name</label><input className="in" value={me?.fullName || ""} disabled /></div>
          <div className="field"><label className="lbl">Email</label><input className="in" value={me?.email || username} disabled /></div>
          <div className="field"><label className="lbl">Phone</label><input className="in" value={me?.phone || ""} disabled /></div>
          <p className="muted">These details come from your verified KYC and can't be edited here. To change them, use <button className="link" onClick={() => setSec("details")}>Update details</button>.</p>
        </>
      )}

      {sec === "details" && (
        <>
          {me?.kyc !== "APPROVED" ? <div className="banner warn">Complete KYC first. Details can be changed only after verification.</div> : (
            <form onSubmit={requestChange}>
              <p className="muted" style={{ marginBottom: 14 }}>Edit what changed and tell us why. The admin reviews it, and your profile updates only after approval. Your email can't be changed.</p>
              {pending && <div className="banner info">You have a request under review. You can send another once it is decided.</div>}
              <div className="grid2">
                {FIELDS.map(([k, l]) => (
                  <div className="field" key={k}><label className="lbl">{l}</label>
                    <input className="in" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
                ))}
              </div>
              <div className="field"><label className="lbl">Reason for change</label>
                <input className="in" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Moved to a new city" /></div>
              <button className="btn" disabled={busy || pending}>{busy ? "Sending..." : "Request update"}</button>
            </form>
          )}
          <h3 style={{ margin: "26px 0 8px", fontSize: 15 }}>My update requests</h3>
          <RequestList items={detailReqs} empty="No update requests yet."
            describe={(r) => "Update: " + Object.keys(r.data).filter((k) => k !== "reason").join(", ")} />
        </>
      )}

      {sec === "security" && (
        <>
          <form onSubmit={changePw}>
            <h3 style={{ marginBottom: 14 }}>Change password</h3>
            <div className="field"><label className="lbl">Current password</label><input className="in" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} /></div>
            <div className="field"><label className="lbl">New password</label><input className="in" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
            <div className="field"><label className="lbl">Confirm new password</label><input className="in" type="password" value={conf} onChange={(e) => setConf(e.target.value)} /></div>
            <button className="btn">Update password</button>
          </form>
          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "26px 0" }} />
          <h3>Transaction PIN</h3>
          <p className="muted" style={{ margin: "6px 0 14px" }}>Set, change or reset your PIN from the Transaction PIN section.</p>
          <button className="btn ghost" onClick={() => setSec("pin")}>Manage PIN</button>
        </>
      )}
      {sec === "pin" && <PinPage st={st} reload={reload} flash={flash} />}
      {sec === "faq" && <Faq />}
      {sec === "danger" && (
        <form onSubmit={del} className="danger-zone" style={{ padding: 20, borderRadius: 14 }}>
          <h3 style={{ color: "var(--red)" }}>Delete account</h3>
          <p className="muted" style={{ margin: "6px 0 16px" }}>Your account is deactivated immediately and you are logged out. After admin approval (within 2 days) your login, accounts, cards, investments and history are permanently deleted.</p>
          <div className="field"><label className="lbl">Password</label><input className="in" type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} /></div>
          <div className="field"><label className="lbl">Type DELETE to confirm</label><input className="in" value={delTxt} onChange={(e) => setDelTxt(e.target.value)} /></div>
          <button className="btn red" disabled={busy}>Request account deletion</button>
        </form>
      )}
    </div>
  );
}