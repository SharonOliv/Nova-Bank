package com.bank.bank;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "service_request")
@Getter @Setter @NoArgsConstructor
public class ServiceRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private String kind;      // CARD | LOAN | DETAILS
    private String status;    // PENDING | APPROVED | REJECTED
    private String note;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime reviewedAt;
    private String reviewedBy;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "service_request_data", joinColumns = @JoinColumn(name = "request_id"))
    @MapKeyColumn(name = "k")
    @Column(name = "v", length = 500)
    private Map<String, String> data = new HashMap<>();
}