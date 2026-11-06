package com.bank.bank;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
public class Card {
    public enum Type { DEBIT, CREDIT, PREPAID }
    public enum Network { VISA, MASTERCARD, RUPAY }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String owner;
    @Column(nullable = false)
    private String accountNumber;
    @Column(unique = true, nullable = false)
    private String cardNumber;
    @Enumerated(EnumType.STRING)
    private Type type;
    @Enumerated(EnumType.STRING)
    private Network network;
    private String holder;
    private String expiry;
    private boolean blocked;
    private LocalDateTime createdAt = LocalDateTime.now();
    private Boolean replaced = false;

    @Getter(AccessLevel.NONE)
    private String cvv;
    public String revealCvv() { return cvv; }
}