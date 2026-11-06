package com.bank.bank;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String username;
    private String pinHash;
    private int pinAttempts;
    private LocalDateTime lockedUntil;
    private String fullName;
    private String email;
    private String phone;
}