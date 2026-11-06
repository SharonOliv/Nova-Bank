package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AccountRepository accounts;
    private final TxnRepository txns;
    private final KycService kyc;
    private final RequestService reqs;
    private final AccountService svc;

    public record RejectReq(String reason) {}
    public record NoteReq(String note) {}

    @GetMapping("/accounts")
    public List<Account> allAccounts() { return accounts.findAll(); }

    @GetMapping("/transactions")
    public List<Txn> allTransactions() { return txns.findAllByOrderByTimestampDesc(); }

    @GetMapping("/kyc")
    public List<Kyc> allKyc() { return kyc.all(); }

    @PostMapping("/kyc/{id}/approve")
    public Kyc approve(@PathVariable Long id, Authentication a) { return kyc.review(id, true, null, a.getName()); }

    @PostMapping("/kyc/{id}/reject")
    public Kyc reject(@PathVariable Long id, @RequestBody(required = false) RejectReq r, Authentication a) {
        return kyc.review(id, false, r == null ? null : r.reason(), a.getName());
    }

    @GetMapping("/requests")
    public List<ServiceRequest> requests() { return reqs.all(); }

    @PostMapping("/requests/{id}/approve")
    public ServiceRequest approveReq(@PathVariable Long id, Authentication a) {
        return reqs.review(id, true, null, a.getName());
    }

    @PostMapping("/requests/{id}/reject")
    public ServiceRequest rejectReq(@PathVariable Long id, @RequestBody(required = false) NoteReq r, Authentication a) {
        return reqs.review(id, false, r == null ? null : r.note(), a.getName());
    }

    /** Called when the admin approves an account deletion: removes all banking data of the user. */
    @DeleteMapping("/users/data")
    public Map<String, String> deleteUserData(@RequestParam String username) {
        svc.wipe(username);
        return Map.of("message", "Deleted");
    }
}