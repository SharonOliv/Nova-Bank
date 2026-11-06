const FAQ = [
  ["How do I start banking?", "Register, sign in and complete KYC. Once an admin approves it, your primary Savings account opens automatically and you set your own 4-digit transaction PIN."],
  ["Why is KYC mandatory?", "Banks must verify your identity. Until KYC is approved you can't open accounts, set a PIN or make any transaction. If it is rejected, correct the details and submit again."],
  ["I forgot my PIN. What do I do?", "Open Settings, then Forgot PIN, and request an email code. Enter the code and choose a new PIN. This also unlocks a locked PIN."],
  ["My PIN got locked.", "Three wrong PIN attempts lock it for 15 minutes. You can wait, or reset it with an email code."],
  ["How do I get a debit or credit card?", "Go to Accounts & Cards and request a card type and the account to link. The admin approves it, and the card number, network and CVV are generated at that point. The CVV is hidden and shows only after you enter your PIN."],
  ["How do loans work?", "Choose a loan, enter an amount and tenure, and apply. The admin sanctions it, and the money is credited to the account you selected."],
  ["How do I change my name, phone or address?", "Your profile comes from your verified KYC and can't be edited directly. Use Settings, then Update details, and the admin approves the change."],
  ["How can I move money between my own accounts?", "Use Quick actions, then Self transfer. Pick the source and destination account, enter the amount and confirm with your PIN."],
  ["How do I delete my account?", "Settings, then Delete account. Your account is deactivated immediately and permanently deleted after the admin approves it, within 2 days."],
];

export default function Faq() {
  return <div>{FAQ.map(([q, a]) => <details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>;
}