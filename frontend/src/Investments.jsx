import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { bank } from "./api";
import { inr, TYPE_LABEL, errMsg, PinModal } from "./ui";

const CATS = [["ALL", "All"], ["METAL", "Metals"], ["JEWELLERY", "Jewellery"], ["MF", "Mutual funds"]];
const COLORS = ["#2457f5", "#14b8a6", "#f59e0b", "#dc2626", "#8b5cf6", "#0ea5e9", "#64748b"];

export default function Investments({ accounts, reload, flash, onResendPin }) {
  const [market, setMarket] = useState([]);
  const [holds, setHolds] = useState([]);
  const [cat, setCat] = useState("ALL");
  const [sel, setSel] = useState("GOLD");
  const [days, setDays] = useState(30);
  const [hist, setHist] = useState([]);
  const [side, setSide] = useState("buy");
  const [amount, setAmount] = useState("");
  const [units, setUnits] = useState("");
  const [sip, setSip] = useState(false);
  const [ask, setAsk] = useState(false);
  const [accSel, setAccSel] = useState("");
  const [busy, setBusy] = useState(false);
  const acc = accounts.some((a) => a.accountNumber === accSel) ? accSel : accounts[0]?.accountNumber;

  const load = async () => {
    try {
      const [m, h] = await Promise.all([bank.get("/market"), bank.get("/investments")]);
      setMarket(m.data); setHolds(h.data);
    } catch { /* ignore, retried by interval */ }
  };
  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, []);
  useEffect(() => { bank.get(`/market/${sel}/history`, { params: { days } }).then((r) => setHist(r.data)).catch(() => {}); }, [sel, days]);

  const q = market.find((m) => m.code === sel);
  const held = holds.find((h) => h.asset === sel);
  const up = hist.length > 1 ? hist[hist.length - 1].price >= hist[0].price : true;
  const color = up ? "#059669" : "#dc2626";
  const list = market.filter((m) => cat === "ALL" || m.category === cat);

  const totals = useMemo(() => {
    const inv = holds.reduce((s, h) => s + Number(h.invested), 0);
    const val = holds.reduce((s, h) => s + Number(h.value), 0);
    return { inv, val, pnl: val - inv };
  }, [holds]);
  const pie = holds.map((h) => ({ name: h.name, value: Number(h.value) })).filter((p) => p.value > 0);

  const validate = (e) => {
  e.preventDefault();
  if (side === "buy" && (!amount || Number(amount) < 10)) return flash("err", "Minimum investment is ₹10");
  if (side === "sell" && (!units || Number(units) <= 0)) return flash("err", "Enter units to sell");
  setAsk(true);
};

const confirm = async (pin) => {
  if (side === "buy") {
    await bank.post("/investments/buy", { accountNumber: acc, asset: sel, amount, sip, pin });
    flash("ok", sip ? "SIP started" : "Investment successful");
  } else {
    await bank.post("/investments/sell", { accountNumber: acc, asset: sel, units, pin });
    flash("ok", "Sold successfully");
  }
  setAsk(false); setAmount(""); setUnits("");
  load(); reload();
};

  return (
    <div className="stack">
      <div className="grid3">
        <div className="stat"><small>Invested</small><h3>{inr(totals.inv)}</h3></div>
        <div className="stat"><small>Current value</small><h3>{inr(totals.val)}</h3></div>
        <div className="stat"><small>Returns</small>
          <h3 className={totals.pnl >= 0 ? "up" : "down"}>{totals.pnl >= 0 ? "+" : ""}{inr(totals.pnl)}</h3></div>
      </div>

      <div className="card">
        <div className="tabs">
          {CATS.map(([k, l]) => <button key={k} className={cat === k ? "on" : ""} onClick={() => setCat(k)}>{l}</button>)}
        </div>
        <div className="mkt-grid">
          {list.map((m) => (
            <button key={m.code} className={`mkt ${sel === m.code ? "on" : ""}`} onClick={() => setSel(m.code)}>
              <b>{m.name}</b>
              <h4>{inr(m.price)}<small className="muted"> /{m.unit}</small></h4>
              <span className={m.change >= 0 ? "up" : "down"}>{m.change >= 0 ? "▲" : "▼"} {Math.abs(m.change)}% today</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cols">
        <div className="card">
          <div className="card-head">
            <h3>{q?.name} price</h3>
            <div className="tabs" style={{ margin: 0 }}>
              {[7, 30, 90].map((d) => <button key={d} className={days === d ? "on" : ""} onClick={() => setDays(d)}>{d}D</button>)}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hist} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7eaf3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={60} />
              <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }} />
              <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2.5} fill="url(#gInv)" />
            </AreaChart>
          </ResponsiveContainer>
          <p className="muted" style={{ marginTop: 8 }}>Prices are simulated for demo purposes.</p>
        </div>

        <div className="card">
          <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button type="button" className={side === "buy" ? "on" : ""} onClick={() => setSide("buy")}>Buy</button>
            <button type="button" className={side === "sell" ? "on" : ""} onClick={() => setSide("sell")}>Sell</button>
          </div>
          <form onSubmit={validate}>
            <div className="field">
              <label className="lbl">{side === "buy" ? "Pay from" : "Credit to"}</label>
              <select className="in" value={acc} onChange={(e) => setAccSel(e.target.value)}>
                {accounts.map((a) => <option key={a.accountNumber} value={a.accountNumber}>{TYPE_LABEL[a.type]} • ₹{Number(a.balance).toLocaleString("en-IN")}</option>)}
              </select>
            </div>

            {side === "buy" ? (
              <>
                <div className="field">
                  <label className="lbl">Amount (₹)</label>
                  <input className="in" type="number" min="10" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1000" />
                  {amount > 0 && q && <p className="muted" style={{ marginTop: 6 }}>≈ {(amount / q.price).toFixed(4)} {q.unit}</p>}
                </div>
                <label className="row" style={{ marginBottom: 14, fontSize: 14 }}>
                  <input type="checkbox" checked={sip} onChange={(e) => setSip(e.target.checked)} /> Make this a monthly SIP
                </label>
              </>
            ) : (
              <div className="field">
                <label className="lbl">Units to sell {held && <span className="muted">(you hold {Number(held.units).toFixed(4)})</span>}</label>
                <input className="in" type="number" step="any" value={units} onChange={(e) => setUnits(e.target.value)} />
                {held && <button type="button" className="link" onClick={() => setUnits(held.units)}>Sell all</button>}
              </div>
            )}

            <button className="btn full" disabled={busy} style={{ padding: 14 }}>
              {busy ? "Processing..." : `${side === "buy" ? (sip ? "Start SIP in" : "Buy") : "Sell"} ${q?.name || ""}`}
            </button>
          </form>
        </div>
      </div>

      <div className="cols">
        <div className="card">
          <div className="card-head"><h3>Your holdings</h3></div>
          {holds.length === 0 ? <div className="empty">No investments yet. Pick an asset above and invest.</div> : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Asset</th><th>Units</th><th>Invested</th><th>Value</th><th>Returns</th></tr></thead>
                <tbody>
                  {holds.map((h) => (
                    <tr key={h.asset}>
                      <td><b>{h.name}</b>{h.sipAmount && <><br /><span className="pill amber">SIP {inr(h.sipAmount)}/mo</span></>}</td>
                      <td>{Number(h.units).toFixed(4)} {h.unit}</td>
                      <td>{inr(h.invested)}</td>
                      <td>{inr(h.value)}</td>
                      <td className={Number(h.pnl) >= 0 ? "up" : "down"}>{Number(h.pnl) >= 0 ? "+" : ""}{inr(h.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-head"><h3>Allocation</h3></div>
          {pie.length === 0 ? <div className="empty">Nothing to show yet.</div> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {ask && <PinModal title="Confirm with your PIN" detail={side === "buy" ? `Invest ₹${amount} in ${q?.name}` : `Sell ${units} units of ${q?.name}`}
  onSubmit={confirm} onClose={() => setAsk(false)} onForgot={onResendPin} />}
    </div>
  );
}