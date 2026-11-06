package com.bank.bank;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;

public interface TxnRepository extends JpaRepository<Txn, Long> {
    List<Txn> findByAccountNumberInOrderByTimestampDesc(Collection<String> numbers);
    List<Txn> findAllByOrderByTimestampDesc();
    void deleteByAccountNumberIn(Collection<String> numbers);
}