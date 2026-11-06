package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class PinService {
    private final CustomerRepository customers;
    private final OtpService otp;
    private final KycService kyc;
    private final BCryptPasswordEncoder enc = new BCryptPasswordEncoder();

    public Customer customer(String user) {
        return customers.findByUsername(user).orElseGet(() -> {
            Customer c = new Customer();
            c.setUsername(user);
            return customers.save(c);
        });
    }

    public boolean hasPin(String user) {
        return customers.findByUsername(user).map(c -> c.getPinHash() != null).orElse(false);
    }

    /** First-time PIN, chosen by the user, only after KYC is approved. */
    @Transactional
    public void set(String user, String pin) {
        kyc.requireApproved(user);
        Customer c = customer(user);
        if (c.getPinHash() != null) throw bad("PIN already set. Use Change PIN or Forgot PIN");
        store(c, pin);
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void change(String user, String oldPin, String newPin) {
        checkPin(newPin);
        if (newPin.equals(oldPin)) throw bad("New PIN must be different from the old PIN");
        verify(user, oldPin);
        store(customer(user), newPin);
    }

    public void requestReset(String user) {
        if (!hasPin(user)) throw bad("You haven't set a PIN yet");
        otp.send(user, "PIN_RESET");
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void confirmReset(String user, String code, String newPin) {
        checkPin(newPin);
        otp.verify(user, "PIN_RESET", code);
        store(customer(user), newPin);   // also clears any PIN lock
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void verify(String user, String pin) {
        kyc.requireApproved(user);
        Customer c = customer(user);
        if (c.getPinHash() == null) throw bad("Set your transaction PIN first");
        if (c.getLockedUntil() != null && c.getLockedUntil().isAfter(LocalDateTime.now()))
            throw new ResponseStatusException(HttpStatus.LOCKED,
                    "PIN locked until " + c.getLockedUntil().format(DateTimeFormatter.ofPattern("hh:mm a")) + ". You can reset it with an email code");
        if (pin == null || !enc.matches(pin, c.getPinHash())) {
            c.setPinAttempts(c.getPinAttempts() + 1);
            if (c.getPinAttempts() >= 3) {
                c.setPinAttempts(0);
                c.setLockedUntil(LocalDateTime.now().plusMinutes(15));
                customers.save(c);
                throw new ResponseStatusException(HttpStatus.LOCKED, "Too many wrong attempts. PIN locked for 15 minutes");
            }
            customers.save(c);
            throw bad("Incorrect PIN. " + (3 - c.getPinAttempts()) + " attempt(s) left");
        }
        c.setPinAttempts(0);
        customers.save(c);
    }

    private void store(Customer c, String pin) {
        checkPin(pin);
        c.setPinHash(enc.encode(pin));
        c.setPinAttempts(0);
        c.setLockedUntil(null);
        customers.save(c);
    }

    private void checkPin(String pin) {
        if (pin == null || !pin.matches("\\d{4}")) throw bad("PIN must be exactly 4 digits");
        if (pin.matches("(\\d)\\1{3}") || "0123456789".contains(pin) || "9876543210".contains(pin))
            throw bad("PIN is too easy to guess. Avoid repeated or sequential digits");
    }

    private ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
}