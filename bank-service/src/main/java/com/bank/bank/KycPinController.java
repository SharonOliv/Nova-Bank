package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class KycPinController {
    private final KycService kyc;
    private final PinService pins;

    public record PinReq(String pin) {}
    public record ChangeReq(String oldPin, String newPin) {}
    public record ResetReq(String code, String newPin) {}

    @GetMapping("/status")
    public Map<String, Object> status(Authentication a) {
        Kyc k = kyc.find(a.getName()).orElse(null);
        Map<String, Object> m = new HashMap<>();
        m.put("kyc", k == null ? "NOT_STARTED" : k.getStatus());
        m.put("kycReason", k == null ? null : k.getRejectReason());
        m.put("fullName", k == null ? null : k.getFullName());
        m.put("hasPin", pins.hasPin(a.getName()));
        return m;
    }

    @GetMapping("/kyc")
    public Object myKyc(Authentication a) {
        Kyc k = kyc.find(a.getName()).orElse(null);
        return k == null ? Map.of("status", "NOT_STARTED") : k;
    }

    @PostMapping("/kyc")
    public Kyc submit(Authentication a, @RequestBody KycService.KycReq r) { return kyc.submit(a.getName(), r); }

    @PostMapping("/pin/set")
    public Map<String, String> set(Authentication a, @RequestBody PinReq r) {
        pins.set(a.getName(), r.pin());
        return Map.of("message", "PIN set");
    }

    @PostMapping("/pin/change")
    public Map<String, String> change(Authentication a, @RequestBody ChangeReq r) {
        pins.change(a.getName(), r.oldPin(), r.newPin());
        return Map.of("message", "PIN changed");
    }

    @PostMapping("/pin/reset/request")
    public Map<String, String> requestReset(Authentication a) {
        pins.requestReset(a.getName());
        return Map.of("message", "Code sent to " + a.getName());
    }

    @PostMapping("/pin/reset/confirm")
    public Map<String, String> confirmReset(Authentication a, @RequestBody ResetReq r) {
        pins.confirmReset(a.getName(), r.code(), r.newPin());
        return Map.of("message", "PIN reset");
    }
}