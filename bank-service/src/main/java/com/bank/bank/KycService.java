package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class KycService {
    private final KycRepository repo;
    private final CaptchaService captcha;

    @Value("${kyc.auto-approve:false}") private boolean autoApprove;

    public record KycReq(String fullName, String dob, String phone, String pan, String aadhaar,
                     String address, String city, String pincode,
                     String phoneCaptchaId, String phoneCaptcha, String aadhaarCaptchaId, String aadhaarCaptcha,
                     String panCaptchaId, String panCaptcha) {}

    public Optional<Kyc> find(String user) { return repo.findByUsername(user); }
    public List<Kyc> all() { return repo.findAllByOrderBySubmittedAtDesc(); }

    public void requireApproved(String user) {
        boolean ok = repo.findByUsername(user).map(k -> "APPROVED".equals(k.getStatus())).orElse(false);
        if (!ok) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Complete KYC verification to make transactions");
    }

    @Transactional
    public Kyc submit(String user, KycReq r) {
        Kyc k = repo.findByUsername(user).orElseGet(Kyc::new);
        if ("APPROVED".equals(k.getStatus())) throw bad("Your KYC is already verified");
        if ("PENDING".equals(k.getStatus())) throw bad("Your KYC is already under review");

        String name = clean(r.fullName());
        if (name.length() < 3 || !name.matches("[A-Za-z .'-]+")) throw bad("Enter your full name as on your PAN card");
        LocalDate dob;
        try { dob = LocalDate.parse(clean(r.dob())); } catch (Exception e) { throw bad("Enter a valid date of birth"); }
        if (dob.isAfter(LocalDate.now().minusYears(18))) throw bad("You must be at least 18 years old");
        if (dob.isBefore(LocalDate.now().minusYears(120))) throw bad("Enter a valid date of birth");
        String phone = clean(r.phone());
        if (!phone.matches("[6-9]\\d{9}")) throw bad("Enter a valid 10-digit mobile number");
        String pan = clean(r.pan()).toUpperCase();
        if (!pan.matches("[A-Z]{5}\\d{4}[A-Z]")) throw bad("Enter a valid PAN (for example ABCDE1234F)");
        String aadhaar = clean(r.aadhaar()).replaceAll("\\s", "");
        if (!aadhaar.matches("\\d{12}")) throw bad("Aadhaar number must be 12 digits");
        String address = clean(r.address());
        if (address.length() < 5) throw bad("Enter your full address");
        String city = clean(r.city());
        if (city.length() < 2) throw bad("Enter your city");
        String pincode = clean(r.pincode());
        if (!pincode.matches("\\d{6}")) throw bad("Pincode must be 6 digits");
        if (repo.existsByPanAndUsernameNot(pan, user)) throw bad("This PAN is already registered with another account");

        captcha.verify(r.phoneCaptchaId(), r.phoneCaptcha());
        captcha.verify(r.aadhaarCaptchaId(), r.aadhaarCaptcha());
        captcha.verify(r.panCaptchaId(), r.panCaptcha());
        k.setUsername(user);
        k.setFullName(name);
        k.setDob(dob);
        k.setPhone(phone);
        k.setPan(pan);
        k.setAadhaarLast4(aadhaar.substring(8));
        k.setAddress(address);
        k.setCity(city);
        k.setPincode(pincode);
        k.setRejectReason(null);
        k.setSubmittedAt(LocalDateTime.now());
        if (autoApprove) {
            k.setStatus("APPROVED");
            k.setReviewedAt(LocalDateTime.now());
            k.setReviewedBy("AUTO");
        } else {
            k.setStatus("PENDING");
            k.setReviewedAt(null);
            k.setReviewedBy(null);
        }
        return repo.save(k);
    }

    @Transactional
    public Kyc review(Long id, boolean approve, String reason, String admin) {
        Kyc k = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KYC record not found"));
        if (!"PENDING".equals(k.getStatus())) throw bad("This KYC has already been reviewed");
        k.setStatus(approve ? "APPROVED" : "REJECTED");
        k.setRejectReason(approve ? null : (reason == null || reason.isBlank() ? "Details could not be verified" : reason.trim()));
        k.setReviewedAt(LocalDateTime.now());
        k.setReviewedBy(admin);
        return repo.save(k);
    }

    @Transactional
    public void wipe(String user) { repo.deleteByUsername(user); }

    private String clean(String s) { return s == null ? "" : s.trim(); }
    private ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }

    @Transactional
    public void applyChange(String user, Map<String, String> d) {
        Kyc k = repo.findByUsername(user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KYC record not found"));
        if (d.containsKey("fullName")) k.setFullName(d.get("fullName"));
        if (d.containsKey("phone")) k.setPhone(d.get("phone"));
        if (d.containsKey("address")) k.setAddress(d.get("address"));
        if (d.containsKey("city")) k.setCity(d.get("city"));
        if (d.containsKey("pincode")) k.setPincode(d.get("pincode"));
        repo.save(k);
    }
}