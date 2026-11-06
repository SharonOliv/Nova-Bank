package com.bank.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DemoUserSeeder implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    @Value("${demo.seed:false}") private boolean enabled;
    @Value("${demo.password:Demo@1234}") private String password;

    public DemoUserSeeder(UserRepository users, PasswordEncoder encoder) { this.users = users; this.encoder = encoder; }

    @Override
    public void run(String... args) {
        if (!enabled) return;
        for (String e : new String[]{"alice@demo.com", "bob@demo.com", "carol@demo.com"}) {
            if (users.findByUsername(e).isPresent()) continue;
            User u = new User();
            u.setUsername(e);
            u.setPassword(encoder.encode(password));
            u.setRole("USER");
            u.setStatus("APPROVED");
            users.save(u);
        }
        System.out.println("Demo users seeded");
    }
}