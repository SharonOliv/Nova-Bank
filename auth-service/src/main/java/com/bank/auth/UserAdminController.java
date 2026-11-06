package com.bank.auth;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class UserAdminController {
    private final UserRepository users;
    private final OtpRepository otps;

    public UserAdminController(UserRepository users, OtpRepository otps) { this.users = users; this.otps = otps; }

    public record UserView(Long id, String username, String role, String status, LocalDateTime deactivatedAt) {}

    @GetMapping("/users")
    public List<UserView> list() {
        return users.findAll().stream()
                .map(u -> new UserView(u.getId(), u.getUsername(), u.getRole(),
                        u.getStatus() == null ? "APPROVED" : u.getStatus(), u.getDeactivatedAt()))
                .toList();
    }

    @PostMapping("/users/{id}/approve")
    public Map<String, String> approve(@PathVariable Long id) { return set(id, "APPROVED"); }

    @PostMapping("/users/{id}/restore")
    public Map<String, String> restore(@PathVariable Long id) { return set(id, "APPROVED"); }

    @PostMapping("/users/{id}/reject")
    public Map<String, String> reject(@PathVariable Long id) { return set(id, "REJECTED"); }

    /** Final step of account deletion: only for deactivated accounts. */
    @PostMapping("/users/{id}/delete")
    @Transactional
    public Map<String, String> delete(@PathVariable Long id) {
        User u = find(id);
        if (!"DEACTIVATED".equals(u.getStatus()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only deactivated accounts can be deleted");
        otps.deleteByEmail(u.getUsername());
        users.delete(u);
        return Map.of("message", "Deleted");
    }

    private User find(Long id) {
        User u = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if ("ADMIN".equals(u.getRole()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change an admin");
        return u;
    }

    private Map<String, String> set(Long id, String status) {
        User u = find(id);
        u.setStatus(status);
        if ("APPROVED".equals(status)) u.setDeactivatedAt(null);
        users.save(u);
        return Map.of("message", status);
    }
}