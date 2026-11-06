import { useState } from "react";
import { Copy, Check } from "lucide-react";

export const OFFERS = [
  { code: "FIRSTCARD5", tone: "g1", tag: "New cardholders", title: "Get your first card and enjoy 5% off", desc: "Request a NovaBank card and get 5% off your first 3 online purchases.", cta: ["Request a card", "accounts"] },
  { code: "GOLD5", tone: "g2", tag: "Jewellery partner", title: "5% off making charges on gold jewellery", desc: "Buy digital gold and redeem it with our jewellery partners.", cta: ["Invest in gold", "invest"] },
  { code: "FLYHIGH10", tone: "g3", tag: "Travel", title: "₹1,000 off domestic flights", desc: "On bookings above ₹8,000 paid with your NovaBank card.", cta: null },
  { code: "DINE15", tone: "g4", tag: "Dining", title: "15% off at partner restaurants", desc: "Up to ₹300 off, valid on weekends.", cta: null },
  { code: "SHOPMORE", tone: "g5", tag: "Electronics", title: "10% instant discount on gadgets", desc: "Up to ₹2,000 off on phones and laptops from partner stores.", cta: null },
  { code: "LOAN0", tone: "g6", tag: "Loans", title: "Zero processing fee on personal loans", desc: "Apply this month and the processing fee is waived.", cta: ["Apply for a loan", "loans"] },
  { code: "SIP100", tone: "g1", tag: "Investments", title: "₹100 welcome reward on your first SIP", desc: "Start a monthly SIP in any mutual fund.", cta: ["Start a SIP", "invest"] },
  { code: "FUEL3", tone: "g3", tag: "Fuel", title: "3% back on fuel", desc: "Valid at partner fuel stations, up to ₹150 per month.", cta: null },
];

function Promo({ code }) {
  const [ok, setOk] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code);
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  };
  return <button className="promo" onClick={copy} title="Copy code">{code} {ok ? <Check size={14} /> : <Copy size={14} />}</button>;
}

export function OfferMarquee() {
  return (
    <div className="marquee">
      <div className="marquee-track">
        {[...OFFERS, ...OFFERS].map((o, i) => (
          <div className={`offer ${o.tone}`} key={i}>
            <small>{o.tag}</small>
            <h4>{o.title}</h4>
            <div className="foot"><Promo code={o.code} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Offers({ go }) {
  return (
    <div className="stack">
      <div className="offers-grid">
        {OFFERS.map((o) => (
          <div className={`offer ${o.tone}`} key={o.code}>
            <small>{o.tag}</small>
            <h4>{o.title}</h4>
            <p>{o.desc}</p>
            <div className="foot">
              <Promo code={o.code} />
              {o.cta && <button className="btn" onClick={() => go(o.cta[1])}>{o.cta[0]}</button>}
            </div>
          </div>
        ))}
      </div>
      <p className="muted">Sample offers for demonstration. Promo codes are not redeemable.</p>
    </div>
  );
}