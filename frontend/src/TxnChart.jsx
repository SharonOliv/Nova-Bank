import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

function groupByDay(txns) {
  const m = {};
  txns.forEach((t) => {
    const d = t.timestamp.slice(0, 10);
    m[d] = m[d] || { date: d, Credit: 0, Debit: 0 };
    if (t.type === "CREDIT") m[d].Credit += Number(t.amount);
    else m[d].Debit += Number(t.amount);
  });
  return Object.values(m).sort((a, b) => a.date.localeCompare(b.date));
}

export default function TxnChart({ txns }) {
  const data = groupByDay(txns);
  if (!data.length) return <div className="empty">No transaction data to chart yet.</div>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="gCr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gDr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7eaf3" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }} formatter={(v) => "₹" + Number(v).toLocaleString("en-IN")} />
        <Legend iconType="circle" />
        <Area type="monotone" dataKey="Credit" stroke="#059669" strokeWidth={2.5} fill="url(#gCr)" />
        <Area type="monotone" dataKey="Debit" stroke="#dc2626" strokeWidth={2.5} fill="url(#gDr)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}