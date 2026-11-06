 package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class AccountService {
    private final AccountRepository accounts;
    private final TxnRepository txns;
    private final CardRepository cards;
    private final HoldingRepository holdings;
    private final CustomerRepository customers;
    private final CardService CardService;
    private final KycService kyc;
    private final ServiceRequestRepository requests;

    public record Opened(Account account) {}

   public List<Account> mine(String user) {
    return accounts.findByOwner(user).stream()
            .sorted(Comparator.comparing(Account::isPrimaryAccount, Comparator.reverseOrder())
                    .thenComparing(Account::getId))
            .toList();
    }

    @Transactional
    public Opened open(String user, Account.Type type) {
        kyc.requireApproved(user);
        List<Account> existing = accounts.findByOwner(user);
        if (existing.size() >= 5) throw bad("Maximum 5 accounts allowed");
        Account a = new Account();
        a.setOwner(user);
        a.setType(type);
        a.setPrimaryAccount(existing.isEmpty());
        a.setAccountNumber("AC" + ThreadLocalRandom.current().nextLong(1_000_000_000L, 9_999_999_999L));
        a = accounts.save(a);
        return new Opened(a);
    }

    @Transactional
    public Opened init(String user) {
        List<Account> existing = accounts.findByOwner(user);
        if (!existing.isEmpty()) return new Opened(mine(user).get(0));
        return open(user, Account.Type.SAVINGS);
    }

    @Transactional
    public Account deposit(String user, String number, BigDecimal amt) {
        amt = check(amt);
        Account a = lockOwned(user, number);
        credit(a, amt, "Deposit");
        return a;
    }

    @Transactional
    public Account withdraw(String user, String number, BigDecimal amt) {
        amt = check(amt);
        Account a = lockOwned(user, number);
        debit(a, amt, "Withdrawal");
        return a;
    }

    @Transactional
    public Account transfer(String user, String from, String to, BigDecimal amt) {
        amt = check(amt);
        if (from == null || to == null || to.isBlank() || from.equals(to.trim())) throw bad("Invalid recipient account");
        to = to.trim();
        String first = from.compareTo(to) < 0 ? from : to;      // fixed lock order avoids deadlocks
        String second = first.equals(from) ? to : from;
        Account a1 = lock(first);
        Account a2 = lock(second);
        Account src = a1.getAccountNumber().equals(from) ? a1 : a2;
        Account dst = src == a1 ? a2 : a1;
        if (!src.getOwner().equals(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your account");
        debit(src, amt, "Transfer to " + to);
        credit(dst, amt, "Transfer from " + from);
        return src;
    }

    @Transactional
    public void wipe(String user) {
        List<Account> mine = accounts.findByOwner(user);
        List<String> nums = mine.stream().map(Account::getAccountNumber).toList();
        if (!nums.isEmpty()) txns.deleteByAccountNumberIn(nums);
        cards.deleteByOwner(user);
        holdings.deleteByOwner(user);
        accounts.deleteAll(mine);
        customers.deleteByUsername(user);
        kyc.wipe(user);
        requests.deleteByUsername(user);
    }

    // ---- helpers (public so InvestService can reuse them inside its own transaction) ----
    public Account lockOwned(String user, String number) {
        Account a = lock(number);
        if (!a.getOwner().equals(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your account");
        return a;
    }

    private Account lock(String number) {
        return accounts.lockByNumber(number)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found: " + number));
    }

    public void credit(Account a, BigDecimal amt, String desc) {
        a.setBalance(a.getBalance().add(amt));
        accounts.save(a);
        log(a, Txn.Type.CREDIT, amt, desc);
    }

    public void debit(Account a, BigDecimal amt, String desc) {
        if (a.getBalance().compareTo(amt) < 0) throw bad("Insufficient funds");
        a.setBalance(a.getBalance().subtract(amt));
        accounts.save(a);
        log(a, Txn.Type.DEBIT, amt, desc);
    }

    private void log(Account a, Txn.Type type, BigDecimal amt, String desc) {
        Txn t = new Txn();
        t.setAccountNumber(a.getAccountNumber());
        t.setType(type);
        t.setAmount(amt);
        t.setBalanceAfter(a.getBalance());
        t.setDescription(desc);
        txns.save(t);
    }

    public BigDecimal check(BigDecimal amt) {
        if (amt == null || amt.signum() <= 0) throw bad("Amount must be positive");
        return amt.setScale(2, RoundingMode.HALF_UP);
    }

    private ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
}