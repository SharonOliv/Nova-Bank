package com.bank.auth;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "otp", uniqueConstraints = @UniqueConstraint(columnNames = {"email", "purpose"}))
@Getter @Setter @NoArgsConstructor
public class Otp {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String email;
    private String purpose;
    private String codeHash;
    private LocalDateTime expiresAt;
    private int attempts;
    private LocalDateTime lastSentAt;
}