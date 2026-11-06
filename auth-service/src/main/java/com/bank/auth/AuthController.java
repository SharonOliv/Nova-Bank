package com.bank.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final String EMAIL = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtUtil jwt;
    private final OtpService otp;       // still used elsewhere, keep it
    private final CaptchaService captcha;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtUtil jwt, OtpService otp, CaptchaService captcha) {
        this.users = users; this.encoder = encoder; this.jwt = jwt; this.otp = otp; this.captcha = captcha;
    }

    public record Credentials(String username, String password) {}
    public record ChangePw(String username, String oldPassword, String newPassword) {}
    public record VerifyReq(String username, String code) {}
    public record EmailReq(String username) {}
    public record RegisterReq(String username, String password, String captchaId, String captchaAnswer) {}

    private String norm(String s) { return s == null ? "" : s.trim().toLowerCase(); }

    @PostMapping("/register")
    public Map<String, String> register(@RequestBody RegisterReq req) {
        captcha.verify(req.captchaId(), req.captchaAnswer());
        String email = norm(req.username());
        if (!email.matches(EMAIL) || email.length() > 120)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid email address");
        if (req.password() == null || req.password().length() < 6)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        User existing = users.findByUsername(email).orElse(null);
        if (existing != null && !"UNVERIFIED".equals(existing.getStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        User u = existing != null ? existing : new User();
        u.setUsername(email);
        u.setPassword(encoder.encode(req.password()));
        u.setStatus("APPROVED");              // OTP disabled: was "UNVERIFIED"
        users.save(u);
        // otp.send(email, "REGISTER");       // OTP disabled for now
        return Map.of("message", "Account created. Please sign in");
    }

    // @PostMapping("/verify-email")
    // public Map<String, String> verifyEmail(@RequestBody VerifyReq r) {
    //     String email = norm(r.username());
    //     User u = users.findByUsername(email)
    //             .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired code"));
    //     otp.verify(email, "REGISTER", r.code());
    //     if ("UNVERIFIED".equals(u.getStatus())) { u.setStatus("APPROVED"); users.save(u); }
    //     return Map.of("message", "Email verified");
    // }

    // @PostMapping("/resend-otp")
    // public Map<String, String> resend(@RequestBody EmailReq r) {
    //     String email = norm(r.username());
    //     users.findByUsername(email).filter(u -> "UNVERIFIED".equals(u.getStatus())).ifPresent(u -> otp.send(email, "REGISTER"));
    //     return Map.of("message", "If this email is awaiting verification, a new code has been sent");
    // }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Credentials req) {
        User u = users.findByUsername(norm(req.username()))
                .filter(x -> encoder.matches(req.password() == null ? "" : req.password(), x.getPassword()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        String st = u.getStatus() == null ? "APPROVED" : u.getStatus();
        if (st.equals("UNVERIFIED"))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Please verify your email first");
        if (st.equals("PENDING"))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your registration is awaiting admin approval");
        if (st.equals("REJECTED"))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account has been blocked. Please contact the bank");
        if (st.equals("DEACTIVATED"))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Your account is deactivated and scheduled for deletion within 2 days. Contact the bank to restore it");
        return Map.of("token", jwt.generate(u.getUsername(), u.getRole()),
                      "role", u.getRole(), "username", u.getUsername());
    }

    private User verified(String username, String password) {
        if (username == null || password == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password");
        return users.findByUsername(norm(username))
                .filter(x -> encoder.matches(password, x.getPassword()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password"));
    }

    @PostMapping("/change-password")
    public Map<String, String> changePassword(@RequestBody ChangePw r) {
        User u = verified(r.username(), r.oldPassword());
        if (r.newPassword() == null || r.newPassword().length() < 6)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters");
        u.setPassword(encoder.encode(r.newPassword()));
        users.save(u);
        return Map.of("message", "Password changed");
    }

    @PostMapping("/request-deletion")
    public Map<String, String> requestDeletion(@RequestBody Credentials r) {
        User u = verified(r.username(), r.password());
        if ("ADMIN".equals(u.getRole()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin accounts can't be deleted");
        u.setStatus("DEACTIVATED");
        u.setDeactivatedAt(LocalDateTime.now());
        users.save(u);
        return Map.of("message", "Account deactivated");
    }
}