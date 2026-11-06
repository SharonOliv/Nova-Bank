package com.bank.auth;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class CaptchaController {
    private final CaptchaService captcha;
    public CaptchaController(CaptchaService captcha) { this.captcha = captcha; }

    @GetMapping("/captcha")
    public CaptchaService.Challenge captcha() { return captcha.create(); }
}