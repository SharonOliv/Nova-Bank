import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { bank } from "./api";
import { errMsg } from "./ui";

const EMPTY = { fullName: "", dob: "", address: "", city: "", pincode: "", phone: "", aadhaar: "", pan: "" };
const NOCAP = { id: "", answer: "", ok: false };
const maxDob = () => new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10);

const rules = (f) => {
  const e = {};
  const n = f.fullName.trim();
  if (n.length < 3 || !/^[A-Za-z .'-]+$/.test(n)) e.fullName = "Full name must be at least 3 letters (letters only)";
  if (!f.dob) e.dob = "Date of birth is required";
  else if (f.dob > maxDob()) e.dob = "You must be at least 18 years old";
  if (f.address.trim().length < 5) e.address = "Address must be at least 5 characters";
  if (f.city.trim().length < 2) e.city = "City is required";
  if (!/^\d{6}$/.test(f.pincode)) e.pincode = "Pincode must be 6 digits";
  if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = "Mobile number must be 10 digits and start with 6, 7, 8 or 9";
  if (!/^\d{12}$/.test(f.aadhaar)) e.aadhaar = "Aadhaar number must be 12 digits";
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan)) e.pan = "PAN must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)";
  return e;
};

function Field({ label, err, ok, children }) {
  return (
    <div className="field">
      <label className="lbl">{label} <span className="req">*</span>{ok && <CheckCircle2 size={16} className="tick" />}</label>
      {children}
      {err && <div className="fe">{err}</div>}
    </div>
  );
}

function Captcha({ onState }) {
  const [c, setC] = useState({ id: "", image: "" });
  const [ans, setAns] = useState("");
  const [s, setS] = useState("idle");
  const load = async () => {
    setAns(""); setS("idle"); onState(NOCAP);
    try { setC((await bank.get("/captcha")).data); } catch { setC({ id: "", image: "" }); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line
  const onType = async (v) => {
    v = v.toUpperCase().slice(0, 5); setAns(v);
    if (v.length < 5) { setS("idle"); return onState(NOCAP); }
    try { await bank.post("/captcha/check", { id: c.id, answer: v }); setS("ok"); onState({ id: c.id, answer: v, ok: true }); }
    catch { setS("bad"); onState(NOCAP); }
  };
  return (
    <div className="capbox">
      {c.image ? <img src={c.image} alt="captcha" /> : <span className="muted">Loading...</span>}
      <button type="button" className="capbtn" onClick={load} title="New captcha"><RefreshCw size={16} /></button>
      <input className="in" value={ans} placeholder="Captcha" autoComplete="off" onChange={(e) => onType(e.target.value)} />
      {s === "ok" && <small className="okt">Verified</small>}
      {s === "bad" && <small className="fe">Incorrect, refresh and retry</small>}
    </div>
  );
}

const Sec = ({ n, title, sub, children }) => (
  <div className="card">
    <div className="card-head"><h3><span className="step">{n}</span>{title}</h3><span className="muted">{sub}</span></div>
    {children}
  </div>
);

export default function KycPage({ st, reload, flash }) {
  const [f, setF] = useState(EMPTY);
  const [cap, setCap] = useState({ phone: NOCAP, aadhaar: NOCAP, pan: NOCAP });
  const [capKey, setCapKey] = useState(0);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [srvErr, setSrvErr] = useState("");
  const [k, setK] = useState(null);

  useEffect(() => { bank.get("/kyc").then((r) => setK(r.data)).catch(() => {}); }, [st.kyc]);

  const errs = rules(f);
  const canFill = st.kyc === "NOT_STARTED" || st.kyc === "REJECTED";
  const set = (key, fn = (v) => v) => (e) => setF({ ...f, [key]: fn(e.target.value) });
  const digits = (n) => (v) => v.replace(/\D/g, "").slice(0, n);
  const err = (key) => errs[key] && (tried || f[key]) ? errs[key] : "";
  const capErr = (key) => tried && !cap[key].ok ? "Enter the captcha to verify" : "";
  const setC = (key) => (v) => setCap((p) => ({ ...p, [key]: v }));
  const okOf = (key) => !errs[key] && cap[key].ok;

  const submit = async (e) => {
    e.preventDefault(); setTried(true); setSrvErr("");
    if (Object.keys(errs).length) return flash("err", "Please fix the highlighted fields");
    if (!cap.phone.ok || !cap.aadhaar.ok || !cap.pan.ok) return flash("err", "Please verify the captcha for mobile, Aadhaar and PAN");
    setBusy(true);
    try {
      await bank.post("/kyc", {
        ...f,
        phoneCaptchaId: cap.phone.id, phoneCaptcha: cap.phone.answer,
        aadhaarCaptchaId: cap.aadhaar.id, aadhaarCaptcha: cap.aadhaar.answer,
        panCaptchaId: cap.pan.id, panCaptcha: cap.pan.answer,
      });
      flash("ok", "KYC submitted for review");
      setF(EMPTY); setTried(false); reload();
    } catch (ex) {
      const m = errMsg(ex); setSrvErr(m); flash("err", m);
      if (/captcha/i.test(m)) setCapKey((x) => x + 1);
    } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      {st.kyc === "NOT_STARTED" && <div className="banner warn">KYC is mandatory. You can't open an account or make any transaction until it is verified.</div>}
      {st.kyc === "PENDING" && <div className="banner info">Your KYC is under review. An admin will verify it shortly.</div>}
      {st.kyc === "APPROVED" && <div className="banner ok">KYC verified. You can now make transactions.</div>}
      {st.kyc === "REJECTED" && <div className="banner err">KYC rejected: {st.kycReason}. Please correct your details and submit again.</div>}

      {!canFill && k && k.fullName && (
        <div className="card">
          <div className="card-head"><h3>Your KYC details</h3><span className={`badge ${st.kyc === "APPROVED" ? "cr" : "pend"}`}>{st.kyc}</span></div>
          <div className="kv" style={{ gap: 18 }}>
            <div><small>Full name</small><b>{k.fullName}</b></div>
            <div><small>Date of birth</small><b>{k.dob}</b></div>
            <div><small>Mobile</small><b>{k.phone}</b></div>
            <div><small>PAN</small><b>{k.pan}</b></div>
            <div><small>Aadhaar</small><b>•••• •••• {k.aadhaarLast4}</b></div>
            <div><small>Address</small><b>{k.address}, {k.city} - {k.pincode}</b></div>
          </div>
        </div>
      )}

      {canFill && (
        <form className="stack" onSubmit={submit} noValidate>
          <Sec n={1} title="Personal details" sub="As on your PAN card">
            <div className="grid2">
              <Field label="Full name" err={err("fullName")}><input className="in" value={f.fullName} onChange={set("fullName")} /></Field>
              <Field label="Date of birth" err={err("dob")}><input className="in" type="date" max={maxDob()} value={f.dob} onChange={set("dob")} /></Field>
              <Field label="Address" err={err("address")}><input className="in" value={f.address} onChange={set("address")} /></Field>
              <Field label="City" err={err("city")}><input className="in" value={f.city} onChange={set("city")} /></Field>
              <Field label="Pincode" err={err("pincode")}><input className="in" inputMode="numeric" value={f.pincode} onChange={set("pincode", digits(6))} /></Field>
            </div>
          </Sec>

          <Sec n={2} title="Mobile number" sub="Verify with the captcha">
            <Field label="Mobile number" err={err("phone") || capErr("phone")} ok={okOf("phone")}>
              <input className="in" inputMode="numeric" placeholder="9876543210" value={f.phone} onChange={set("phone", digits(10))} />
              <Captcha key={"p" + capKey} onState={setC("phone")} />
            </Field>
          </Sec>

          <Sec n={3} title="Aadhaar and PAN" sub="Only the last 4 digits of Aadhaar are stored">
            <div className="grid2">
              <Field label="Aadhaar number" err={err("aadhaar") || capErr("aadhaar")} ok={okOf("aadhaar")}>
                <input className="in" inputMode="numeric" placeholder="12 digits" value={f.aadhaar} onChange={set("aadhaar", digits(12))} />
                <Captcha key={"a" + capKey} onState={setC("aadhaar")} />
              </Field>
              <Field label="PAN" err={err("pan") || capErr("pan")} ok={okOf("pan")}>
                <input className="in" maxLength={10} placeholder="ABCDE1234F" value={f.pan} onChange={set("pan", (v) => v.toUpperCase())} />
                <Captcha key={"n" + capKey} onState={setC("pan")} />
              </Field>
            </div>
          </Sec>

          {srvErr && <div className="alert err">{srvErr}</div>}
          <div className="row"><button className="btn" disabled={busy}>{busy ? "Submitting..." : "Submit KYC"}</button><span className="muted"><span className="req">*</span> mandatory fields</span></div>
        </form>
      )}
    </div>
  );
}