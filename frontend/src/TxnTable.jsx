export default function TxnTable({ txns, showAccount }) {
  if (!txns.length) return <div className="empty">No transactions yet.</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Date &amp; Time</th>
            {showAccount && <th>Account</th>}
            <th>Type</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {txns.map((t) => (
            <tr key={t.id}>
              <td>{new Date(t.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
              {showAccount && <td>{t.accountNumber}</td>}
              <td><span className={`badge ${t.type === "CREDIT" ? "cr" : "dr"}`}>{t.type}</span></td>
              <td>{t.description}</td>
              <td style={{ fontWeight: 700, color: t.type === "CREDIT" ? "#059669" : "#dc2626" }}>
                {t.type === "CREDIT" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
              </td>
              <td>₹{Number(t.balanceAfter).toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}