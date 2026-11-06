package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {
    private final KycRepository kycs;
    private final CustomerRepository customers;
    private final AccountRepository accounts;
    private final TxnRepository txns;
    private final CardRepository cards;
    private final BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
    @Value("${demo.seed:false}") private boolean enabled;
    @Value("${demo.pin:4826}") private String pin;

    @Override
    public void run(String... args) {
        if (!enabled) return;
        String[][] people = {
            {"alice@demo.com", "Alice Sharma", "9876543210", "ABCPS1234A", "1234", "Vijayawada", "520001"},
            {"bob@demo.com", "Bob Verma", "9123456780", "BCDQV2345B", "5678", "Hyderabad", "500001"},
            {"carol@demo.com", "Carol Nair", "9988776655", "CDERN3456C", "9012", "Chennai", "600001"}};
        int[] flow = {60000, -4200, 8500, -2300, 15000, -6800};
        String[] note = {"Salary credit", "Grocery payment", "Refund received", "Electricity bill", "Deposit", "Online shopping"};

        for (int i = 0; i < people.length; i++) {
            String[] p = people[i];
            if (kycs.findByUsername(p[0]).isPresent()) continue;

            Kyc k = new Kyc();
            k.setUsername(p[0]); k.setFullName(p[1]); k.setDob(LocalDate.of(1995, 5, 10 + i));
            k.setPhone(p[2]); k.setPan(p[3]); k.setAadhaarLast4(p[4]);
            k.setAddress("12 Demo Street"); k.setCity(p[5]); k.setPincode(p[6]);
            k.setStatus("APPROVED"); k.setSubmittedAt(LocalDateTime.now().minusDays(30));
            k.setReviewedAt(LocalDateTime.now().minusDays(29)); k.setReviewedBy("DEMO");
            kycs.save(k);

            Customer c = new Customer();
            c.setUsername(p[0]); c.setPinHash(enc.encode(pin));
            customers.save(c);

            String accNo = "AC" + (7000000001L + i);
            Account a = new Account();
            a.setOwner(p[0]); a.setAccountNumber(accNo); a.setType(Account.Type.SAVINGS); a.setPrimaryAccount(true);
            BigDecimal bal = BigDecimal.ZERO;
            for (int j = 0; j < flow.length; j++) {
                BigDecimal amt = BigDecimal.valueOf(Math.abs(flow[j]) * (i + 1L));
                bal = flow[j] > 0 ? bal.add(amt) : bal.subtract(amt);
                Txn t = new Txn();
                t.setAccountNumber(accNo); t.setType(flow[j] > 0 ? Txn.Type.CREDIT : Txn.Type.DEBIT);
                t.setAmount(amt); t.setBalanceAfter(bal); t.setDescription(note[j]);
                t.setTimestamp(LocalDateTime.now().minusDays(20 - j * 3L));
                txns.save(t);
            }
            a.setBalance(bal);
            accounts.save(a);

            Card cd = new Card();
            cd.setOwner(p[0]); cd.setAccountNumber(accNo);
            cd.setCardNumber("60810000" + String.format("%08d", 1000 + i));
            cd.setType(Card.Type.DEBIT); cd.setNetwork(Card.Network.RUPAY);
            cd.setHolder(p[1].toUpperCase()); cd.setExpiry("11/31"); cd.setCvv("482");
            cards.save(cd);
        }
        System.out.println("Demo bank data seeded");
    }
}