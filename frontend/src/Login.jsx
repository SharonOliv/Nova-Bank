import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, Mail, Lock, Eye, EyeOff, ShieldCheck, Zap, LineChart, ArrowRight, RefreshCw, ShieldQuestion } from "lucide-react";
import { auth } from "./api";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const errText = (err) => {
  const s = err.response?.status;
  return err.response?.data?.message ||
    (s === 401 ? "Invalid email or password" :
     !err.response ? "Cannot reach server. Is the Auth Service running?" : "Something went wrong");
};

export default function Login() {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setP] = useState("");
  const [confirm, setC] = useState("");
  const [cap, setCap] = useState({ id: "", image: "" });
  const [capAns, setCapAns] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const nav = useNavigate();
  const isLogin = mode === "login", isReg = mode === "register";

  const loadCaptcha = async () => {
    setCapAns("");
    try { const { data } = await auth.get("/auth/captcha"); setCap(data); }
    catch { setCap({ id: "", image: "" }); }
  };

  useEffect(() => { if (isReg) loadCaptcha(); }, [isReg]);

  const em = email.trim().toLowerCase();

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!EMAIL_RE.test(em)) return setMsg({ type: "err", text: "Enter a valid email address." });
    if (!password) return setMsg({ type: "err", text: "Please enter your password." });
    if (isReg) {
      if (password.length < 6) return setMsg({ type: "err", text: "Password must be at least 6 characters." });
      if (password !== confirm) return setMsg({ type: "err", text: "Passwords do not match." });
      if (!cap.id) return setMsg({ type: "err", text: "Captcha not loaded. Click the refresh icon." });
      if (capAns.trim().length < 5) return setMsg({ type: "err", text: "Enter the 5 characters shown in the image." });
    }

    setLoading(true);
    try {
      if (isReg) {
        await auth.post("/auth/register", { username: em, password, captchaId: cap.id, captchaAnswer: capAns });
        setMode("login"); setP(""); setC(""); setCapAns("");
        setMsg({ type: "ok", text: "Account created! Please sign in." });
        return;
      }
      const { data } = await auth.post("/auth/login", { username: em, password });
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("role", data.role);
      sessionStorage.setItem("username", data.username);
      nav("/");
    } catch (err) {
      setMsg({ type: "err", text: errText(err) });
      if (isReg) loadCaptcha();   // a captcha can only be used once
    } finally { setLoading(false); }
  };

  const toggle = () => {
    setMode(isLogin ? "register" : "login");
    setMsg({ type: "", text: "" });
    setP(""); setC(""); setCapAns("");
  };

  return (
    <div className="auth">
      <aside className="auth-art">
        <div className="brand"><div className="brand-logo"><Landmark size={20} /></div> NovaBank</div>
        <div>
          <h1>Banking that moves at the <span>speed of you.</span></h1>
          <p className="sub">Manage accounts, send money and track every rupee in real time, all in one secure place.</p>
        </div>
        <div className="features">
          <div className="feature"><i><ShieldCheck size={18} /></i> KYC-protected banking</div>
          <div className="feature"><i><Zap size={18} /></i> Instant transfers confirmed with your PIN</div>
          <div className="feature"><i><LineChart size={18} /></i> Live insights on your spending &amp; income</div>
        </div>
      </aside>

      <main className="auth-form-wrap">
        <div className="auth-box">
          <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
          <p className="lead">{isLogin ? "Sign in to access your dashboard." : "Register with your email address."}</p>

          {msg.text && <div className={`alert ${msg.type}`}>{msg.text}</div>}

          <form onSubmit={submit}>
            <div className="field">
              <label className="lbl">Email</label>
              <div className="input-wrap">
                <Mail size={18} className="lead-ic" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
            </div>

            <div className="field">
              <label className="lbl">Password</label>
              <div className="input-wrap">
                <Lock size={18} className="lead-ic" />
                <input type={show ? "text" : "password"} value={password} onChange={(e) => setP(e.target.value)} placeholder="Enter your password" autoComplete={isLogin ? "current-password" : "new-password"} />
                <button type="button" className="eye" onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>

            {isReg && (
              <>
                <div className="field">
                  <label className="lbl">Confirm password</label>
                  <div className="input-wrap">
                    <Lock size={18} className="lead-ic" />
                    <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setC(e.target.value)} placeholder="Re-enter your password" autoComplete="new-password" />
                  </div>
                </div>

                <div className="field">
                  <label className="lbl">Captcha</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {cap.image
                      ? <img src={cap.image} alt="captcha" width={170} height={56} style={{ borderRadius: 10, border: "1.5px solid var(--line)" }} />
                      : <div className="muted" style={{ width: 170, height: 56, display: "grid", placeItems: "center", border: "1.5px dashed var(--line)", borderRadius: 10 }}>Loading...</div>}
                    <button type="button" className="eye" style={{ position: "static", transform: "none" }} onClick={loadCaptcha} title="New captcha">
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  <div className="input-wrap">
                    <ShieldQuestion size={18} className="lead-ic" />
                    <input value={capAns} maxLength={5} placeholder="Type the characters above" autoComplete="off"
                      onChange={(e) => setCapAns(e.target.value.toUpperCase())} />
                  </div>
                </div>
              </>
            )}

            <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 8, padding: 14 }}>
              {loading ? "Please wait..." : isLogin ? "Sign in" : "Register"} {!loading && <ArrowRight size={18} />}
            </button>

            <p className="switch">
              {isLogin ? "New to NovaBank? " : "Already have an account? "}
              <button type="button" onClick={toggle}>{isLogin ? "Create an account" : "Sign in"}</button>
            </p>
          </form>
          <div className="secure"><Lock size={13} /> 256-bit secured session</div>
        </div>
      </main>
    </div>
  );
}