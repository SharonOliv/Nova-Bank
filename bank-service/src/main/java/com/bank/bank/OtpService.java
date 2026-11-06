package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class OtpService {
    private static final int TTL_MIN = 10, MAX_TRIES = 5, COOLDOWN_SEC = 60;
    private final OtpRepository repo;
    private final EmailService mail;
    private final BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
    private final SecureRandom rnd = new SecureRandom();

    @Transactional
    public void send(String email, String purpose) {
        Otp o = repo.findByEmailAndPurpose(email, purpose).orElseGet(Otp::new);
        if (o.getLastSentAt() != null && o.getLastSentAt().isAfter(LocalDateTime.now().minusSeconds(COOLDOWN_SEC)))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Please wait a minute before requesting another code");
        String code = String.format("%06d", rnd.nextInt(1_000_000));
        o.setEmail(email);
        o.setPurpose(purpose);
        o.setCodeHash(enc.encode(code));
        o.setExpiresAt(LocalDateTime.now().plusMinutes(TTL_MIN));
        o.setAttempts(0);
        o.setLastSentAt(LocalDateTime.now());
        repo.save(o);
        String subject = "PIN_RESET".equals(purpose) ? "Reset your NovaBank PIN" : "Verify your NovaBank email";
        mail.send(email, subject, "<p>Your NovaBank verification code is</p><h2 style=\"letter-spacing:6px\">" + code
                + "</h2><p>It expires in " + TTL_MIN + " minutes. If you didn't request it, ignore this email. Never share this code with anyone.</p>");
    }

    // noRollbackFor so the wrong-attempt counter is saved even though we throw
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void verify(String email, String purpose, String code) {
        Otp o = repo.findByEmailAndPurpose(email, purpose)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No code requested. Please request a new one"));
        if (o.getExpiresAt().isBefore(LocalDateTime.now())) {
            repo.delete(o);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code expired. Please request a new one");
        }
        if (o.getAttempts() >= MAX_TRIES) {
            repo.delete(o);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many wrong attempts. Please request a new code");
        }
        if (code == null || !enc.matches(code.trim(), o.getCodeHash())) {
            o.setAttempts(o.getAttempts() + 1);
            repo.save(o);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incorrect code. " + (MAX_TRIES - o.getAttempts()) + " attempt(s) left");
        }
        repo.delete(o);
    }
}