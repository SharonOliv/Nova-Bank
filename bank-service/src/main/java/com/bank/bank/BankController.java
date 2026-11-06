package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BankController {
    private final AccountService svc;
    private final TxnRepository txns;
    private final PinService pins;
    private final CustomerRepository Customer;

    public record OpenReq(String type) {}
    public record MoneyReq(String accountNumber, BigDecimal amount, String pin) {}
    public record TransferReq(String fromAccount, String toAccount, BigDecimal amount, String pin) {}
    public record ProfileReq(String fullName, String email, String phone) {}
    public record ProfileDto(String username, String fullName, String email, String phone, boolean hasPin) {}

    public static <E extends Enum<E>> E en(Class<E> c, String v) {
        try { return Enum.valueOf(c, v.trim().toUpperCase()); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + c.getSimpleName().toLowerCase()); }
    }

    @GetMapping("/accounts")
    public List<Account> accounts(Authentication a) { return svc.mine(a.getName()); }

    @PostMapping("/accounts/deposit")
    public Account deposit(Authentication a, @RequestBody MoneyReq r) {
        pins.verify(a.getName(), r.pin());
        return svc.deposit(a.getName(), r.accountNumber(), r.amount());
    }

    @PostMapping("/accounts/transfer")
    public Account transfer(Authentication a, @RequestBody TransferReq r) {
        pins.verify(a.getName(), r.pin());
        return svc.transfer(a.getName(), r.fromAccount(), r.toAccount(), r.amount());
    }

    /** All transactions across ALL of the logged-in user's accounts (private to them). */
    @GetMapping("/transactions")
    public List<Txn> transactions(Authentication a) {
        List<String> nums = svc.mine(a.getName()).stream().map(Account::getAccountNumber).toList();
        if (nums.isEmpty()) return List.of();
        return txns.findByAccountNumberInOrderByTimestampDesc(nums).stream().limit(500).toList();
    }

    @GetMapping("/pin/status")
    public Map<String, Boolean> pinStatus(Authentication a) { return Map.of("hasPin", pins.hasPin(a.getName())); }

    @GetMapping("/profile")
    public ProfileDto profile(Authentication a) { return dto(pins.customer(a.getName())); }

    private ProfileDto dto(Customer c) {
        return new ProfileDto(c.getUsername(), c.getFullName(), c.getEmail(), c.getPhone(), c.getPinHash() != null);
    }

    @PostMapping("/accounts/init")
    public AccountService.Opened init(Authentication a) { return svc.init(a.getName()); }
}