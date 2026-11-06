package com.bank.bank;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    List<ServiceRequest> findByUsernameOrderByCreatedAtDesc(String username);
    List<ServiceRequest> findAllByOrderByCreatedAtDesc();
    long countByUsernameAndKindAndStatus(String username, String kind, String status);
    void deleteByUsername(String username);
}