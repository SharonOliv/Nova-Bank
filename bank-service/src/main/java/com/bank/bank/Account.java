package com.bank.bank;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
public class Account {
    public enum Type { SAVINGS, CURRENT, MERCHANT }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String accountNumber;
    @Column(nullable = false)
    private String owner;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Type type = Type.SAVINGS;
    @Column(precision = 19, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;
    private LocalDateTime createdAt = LocalDateTime.now();
    private boolean primaryAccount;
}