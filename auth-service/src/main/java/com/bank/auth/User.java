package com.bank.auth;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String username;
    @Column(nullable = false)
    private String password;
    @Column(nullable = false)
    private String role = "USER";
    private String status; // PENDING | APPROVED | REJECTED (null = approved, for older users)
    private LocalDateTime deactivatedAt;
}