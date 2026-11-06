package com.bank.bank;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CardRepository extends JpaRepository<Card, Long> {
    List<Card> findByOwnerOrderByIdDesc(String owner);
    Optional<Card> findByIdAndOwner(Long id, String owner);
    long countByOwner(String owner);
    boolean existsByCardNumber(String cardNumber);
    void deleteByOwner(String owner);
    List<Card> findByAccountNumberAndType(String accountNumber, Card.Type type);
}