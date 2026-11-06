package com.bank.bank;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/captcha")
public class CaptchaController {
    private final CaptchaService captcha;
    public CaptchaController(CaptchaService captcha) { this.captcha = captcha; }
    public record Check(String id, String answer) {}

    @GetMapping
    public CaptchaService.Challenge get() { return captcha.create(); }

    @PostMapping("/check")
    public Map<String, String> check(@RequestBody Check r) { captcha.check(r.id(), r.answer()); return Map.of("ok", "true"); }
}