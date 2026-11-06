package com.bank.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSeeder implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    @Value("${admin.email}") private String email;
    @Value("${admin.password}") private String password;

    public AdminSeeder(UserRepository users, PasswordEncoder encoder) { this.users = users; this.encoder = encoder; }

    @Override
    public void run(String... args) {
        String e = email.trim().toLowerCase();
        if (users.findByUsername(e).isPresent()) return;
        User u = new User();
        u.setUsername(e);
        u.setPassword(encoder.encode(password));
        u.setRole("ADMIN");
        u.setStatus("APPROVED");
        users.save(u);
        System.out.println("Seeded admin user: " + e);
    }
}