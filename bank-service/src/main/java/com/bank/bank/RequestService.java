package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RequestService {
    private final ServiceRequestRepository repo;
    private final AccountRepository accounts;
    private final AccountService bank;
    private final CardService cards;
    private final KycService kyc;

    public record CardReq(String accountNumber, String type, String reason) {}
    public record LoanReq(String accountNumber, String loanType, BigDecimal amount, Integer months) {}
    public record DetailsReq(String fullName, String phone, String address, String city, String pincode, String reason) {}
    public record AccountReq(String type) {}

    private record Prod(double rate, long max, int maxMonths) {}
    private static final Map<String, Prod> LOANS = Map.of(
            "CAR", new Prod(8.75, 15_000_000L, 84),
            "HOME", new Prod(8.35, 100_000_000L, 360),
            "PERSONAL", new Prod(10.99, 2_500_000L, 60),
            "GOLD", new Prod(9.0, 10_000_000L, 36),
            "EDUCATION", new Prod(9.5, 7_500_000L, 180),
            "BUSINESS", new Prod(11.5, 50_000_000L, 120));

    public List<ServiceRequest> mine(String user) { return repo.findByUsernameOrderByCreatedAtDesc(user); }
    public List<ServiceRequest> all() { return repo.findAllByOrderByCreatedAtDesc(); }

    @Transactional
    public ServiceRequest card(String user, CardReq r) {
        kyc.requireApproved(user);
        owned(user, r.accountNumber());
        Card.Type t = BankController.en(Card.Type.class, r.type());
        String reason = r.reason() == null ? "" : r.reason().trim().toUpperCase();
        if (t == Card.Type.DEBIT && !List.of("LOST", "EXPIRED", "NEW").contains(reason))
            throw bad("Tell us why you need a debit card: lost, expired or new");
        limit(user, "CARD", 3);
        ServiceRequest s = base(user, "CARD");
        s.getData().put("accountNumber", r.accountNumber());
        s.getData().put("type", t.name());
        if (t == Card.Type.DEBIT) s.getData().put("reason", reason);
        return repo.save(s);
    }

    @Transactional
    public ServiceRequest loan(String user, LoanReq r) {
        kyc.requireApproved(user);
        owned(user, r.accountNumber());
        Prod p = LOANS.get(r.loanType() == null ? "" : r.loanType().toUpperCase());
        if (p == null) throw bad("Unknown loan type");
        BigDecimal amt = bank.check(r.amount());
        if (amt.compareTo(BigDecimal.valueOf(10_000)) < 0 || amt.compareTo(BigDecimal.valueOf(p.max())) > 0)
            throw bad("Amount must be between ₹10,000 and ₹" + p.max());
        int m = r.months() == null ? 0 : r.months();
        if (m < 6 || m > p.maxMonths()) throw bad("Tenure must be between 6 and " + p.maxMonths() + " months");
        limit(user, "LOAN", 3);
        ServiceRequest s = base(user, "LOAN");
        s.getData().put("accountNumber", r.accountNumber());
        s.getData().put("loanType", r.loanType().toUpperCase());
        s.getData().put("amount", amt.toPlainString());
        s.getData().put("months", String.valueOf(m));
        s.getData().put("rate", String.valueOf(p.rate()));
        return repo.save(s);
    }

    @Transactional
    public ServiceRequest account(String user, AccountReq r) {
        kyc.requireApproved(user);
        Account.Type t = BankController.en(Account.Type.class, r.type());
        if (accounts.findByOwner(user).size() + repo.countByUsernameAndKindAndStatus(user, "ACCOUNT", "PENDING") >= 5)
            throw bad("Maximum 5 accounts allowed (pending requests included)");
        ServiceRequest s = base(user, "ACCOUNT");
        s.getData().put("type", t.name());
        return repo.save(s);
    }

    @Transactional
    public ServiceRequest details(String user, DetailsReq r) {
        kyc.requireApproved(user);
        Kyc k = kyc.find(user).orElseThrow(() -> bad("KYC record not found"));
        String reason = clean(r.reason());
        if (reason.length() < 5) throw bad("Please give a reason for the change");
        Map<String, String> d = new LinkedHashMap<>();
        put(d, "fullName", clean(r.fullName()), k.getFullName(), "[A-Za-z .'-]{3,}", "Enter a valid full name");
        put(d, "phone", clean(r.phone()), k.getPhone(), "[6-9]\\d{9}", "Enter a valid 10-digit mobile number");
        put(d, "address", clean(r.address()), k.getAddress(), ".{5,}", "Enter your full address");
        put(d, "city", clean(r.city()), k.getCity(), ".{2,}", "Enter your city");
        put(d, "pincode", clean(r.pincode()), k.getPincode(), "\\d{6}", "Pincode must be 6 digits");
        if (d.isEmpty()) throw bad("No changes detected");
        limit(user, "DETAILS", 1);
        ServiceRequest s = base(user, "DETAILS");
        s.getData().putAll(d);
        s.getData().put("reason", reason);
        return repo.save(s);
    }

    @Transactional
    public ServiceRequest review(Long id, boolean approve, String note, String admin) {
        ServiceRequest s = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!"PENDING".equals(s.getStatus())) throw bad("This request has already been reviewed");
        if (approve) apply(s);   // if this throws, nothing is saved
        s.setStatus(approve ? "APPROVED" : "REJECTED");
        s.setNote(approve ? null : (note == null || note.isBlank() ? "Not approved" : note.trim()));
        s.setReviewedAt(LocalDateTime.now());
        s.setReviewedBy(admin);
        return repo.save(s);
    }

    private void apply(ServiceRequest s) {
        Map<String, String> d = s.getData();
        switch (s.getKind()) {
            case "CARD" -> {
                Card.Type t = Card.Type.valueOf(d.get("type"));
                cards.issue(s.getUsername(), d.get("accountNumber"), t,
                        t == Card.Type.CREDIT ? Card.Network.VISA : t == Card.Type.PREPAID ? Card.Network.MASTERCARD : Card.Network.RUPAY);
            }
            case "ACCOUNT" -> {
                Account a = bank.open(s.getUsername(), Account.Type.valueOf(d.get("type"))).account();
                cards.issue(s.getUsername(), a.getAccountNumber(), Card.Type.DEBIT, Card.Network.RUPAY);
            }
            case "LOAN" -> {
                Account a = bank.lockOwned(s.getUsername(), d.get("accountNumber"));
                bank.credit(a, new BigDecimal(d.get("amount")), "Loan disbursed: " + d.get("loanType") + " loan");
            }
            case "DETAILS" -> kyc.applyChange(s.getUsername(), d);
            default -> throw bad("Unknown request type");
        }
    }

    private void put(Map<String, String> d, String key, String val, String current, String regex, String msg) {
        if (val.isEmpty() || val.equals(current)) return;
        if (!val.matches(regex)) throw bad(msg);
        d.put(key, val);
    }

    private ServiceRequest base(String user, String kind) {
        ServiceRequest s = new ServiceRequest();
        s.setUsername(user);
        s.setKind(kind);
        s.setStatus("PENDING");
        return s;
    }

    private void owned(String user, String acc) {
        accounts.findByAccountNumber(acc == null ? "" : acc).filter(a -> a.getOwner().equals(user))
                .orElseThrow(() -> bad("Select one of your accounts"));
    }

    private void limit(String user, String kind, int max) {
        if (repo.countByUsernameAndKindAndStatus(user, kind, "PENDING") >= max)
            throw bad("You already have " + max + " pending request(s) of this kind. Please wait for approval");
    }

    private String clean(String s) { return s == null ? "" : s.trim(); }
    private ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
}