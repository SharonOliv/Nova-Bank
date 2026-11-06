package com.bank.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OtpRepository extends JpaRepository<Otp, Long> {
    Optional<Otp> findByEmailAndPurpose(String email, String purpose);
    void deleteByEmail(String email);
}