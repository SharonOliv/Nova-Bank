package com.bank.bank;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface KycRepository extends JpaRepository<Kyc, Long> {
    Optional<Kyc> findByUsername(String username);
    List<Kyc> findAllByOrderBySubmittedAtDesc();
    boolean existsByPanAndUsernameNot(String pan, String username);
    void deleteByUsername(String username);
}