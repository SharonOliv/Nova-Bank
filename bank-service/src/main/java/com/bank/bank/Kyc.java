package com.bank.bank;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "kyc")
@Getter @Setter @NoArgsConstructor
public class Kyc {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String username;      // the user's email
    private String fullName;
    private LocalDate dob;
    private String phone;
    private String pan;
    private String aadhaarLast4;  // only the last 4 digits are ever stored
    private String address;
    private String city;
    private String pincode;
    private String status;        // PENDING | APPROVED | REJECTED
    private String rejectReason;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;
}