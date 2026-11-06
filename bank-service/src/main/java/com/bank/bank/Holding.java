package com.bank.bank;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "holding", uniqueConstraints = @UniqueConstraint(columnNames = {"owner", "asset"}))
@Getter @Setter @NoArgsConstructor
public class Holding {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String owner;
    @Column(nullable = false)
    private String asset;
    @Column(precision = 19, scale = 6)
    private BigDecimal units = BigDecimal.ZERO;
    @Column(precision = 19, scale = 2)
    private BigDecimal invested = BigDecimal.ZERO;
    @Column(precision = 19, scale = 2)
    private BigDecimal sipAmount;
}