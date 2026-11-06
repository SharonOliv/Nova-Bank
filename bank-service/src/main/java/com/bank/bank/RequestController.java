package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RequestController {
    private final RequestService svc;
    private final KycService kyc;

    @GetMapping("/requests/mine")
    public List<ServiceRequest> mine(Authentication a) { return svc.mine(a.getName()); }

    @PostMapping("/requests/card")
    public ServiceRequest card(Authentication a, @RequestBody RequestService.CardReq r) { return svc.card(a.getName(), r); }

    @PostMapping("/requests/loan")
    public ServiceRequest loan(Authentication a, @RequestBody RequestService.LoanReq r) { return svc.loan(a.getName(), r); }

    @PostMapping("/requests/details")
    public ServiceRequest details(Authentication a, @RequestBody RequestService.DetailsReq r) { return svc.details(a.getName(), r); }

    /** Profile shown in Settings: read-only, always taken from the verified KYC. */
    @GetMapping("/me")
    public Map<String, Object> me(Authentication a) {
        Kyc k = kyc.find(a.getName()).orElse(null);
        Map<String, Object> m = new HashMap<>();
        m.put("email", a.getName());
        m.put("kyc", k == null ? "NOT_STARTED" : k.getStatus());
        m.put("fullName", k == null ? "" : k.getFullName());
        m.put("phone", k == null ? "" : k.getPhone());
        m.put("address", k == null ? "" : k.getAddress());
        m.put("city", k == null ? "" : k.getCity());
        m.put("pincode", k == null ? "" : k.getPincode());
        return m;
    }

    @PostMapping("/requests/account")
    public ServiceRequest account(Authentication a, @RequestBody RequestService.AccountReq r) { return svc.account(a.getName(), r); }
}