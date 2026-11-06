package com.bank.bank;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "txn")
@Getter @Setter @NoArgsConstructor
public class Txn {
    public enum Type { CREDIT, DEBIT }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String accountNumber;
    @Enumerated(EnumType.STRING)
    private Type type;
    @Column(precision = 19, scale = 2)
    private BigDecimal amount;
    @Column(precision = 19, scale = 2)
    private BigDecimal balanceAfter;
    private String description;
    private LocalDateTime timestamp = LocalDateTime.now();
}