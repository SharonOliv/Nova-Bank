package com.bank.bank;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class CaptchaService {
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final String[] COLORS = {"1e3a8a", "0f766e", "9a3412", "6d28d9", "be123c"};
    private record Entry(String answer, long expires, AtomicInteger tries) {}
    public record Challenge(String id, String image) {}
    private final Map<String, Entry> store = new ConcurrentHashMap<>();
    private final SecureRandom rnd = new SecureRandom();

    public Challenge create() {
        long now = System.currentTimeMillis();
        store.entrySet().removeIf(e -> e.getValue().expires() < now);
        if (store.size() > 10_000) throw bad(HttpStatus.TOO_MANY_REQUESTS, "Please try again shortly");
        StringBuilder t = new StringBuilder();
        for (int i = 0; i < 5; i++) t.append(CHARS.charAt(rnd.nextInt(CHARS.length())));
        String id = UUID.randomUUID().toString();
        store.put(id, new Entry(t.toString(), now + 600_000, new AtomicInteger()));
        return new Challenge(id, "data:image/svg+xml;base64," + Base64.getEncoder().encodeToString(svg(t.toString()).getBytes(StandardCharsets.UTF_8)));
    }

    /** Checks without consuming (for the tick mark). 5 wrong tries kill the challenge. */
    public void check(String id, String answer) {
        Entry e = id == null ? null : store.get(id);
        if (e == null || e.expires() < System.currentTimeMillis()) throw bad(HttpStatus.BAD_REQUEST, "Captcha expired. Please refresh it");
        if (answer == null || !e.answer().equalsIgnoreCase(answer.trim())) {
            if (e.tries().incrementAndGet() >= 5) store.remove(id);
            throw bad(HttpStatus.BAD_REQUEST, "Incorrect captcha");
        }
    }

    /** Final check on submit: single use. */
    public void verify(String id, String answer) { check(id, answer); store.remove(id); }

    private ResponseStatusException bad(HttpStatus s, String m) { return new ResponseStatusException(s, m); }

    private String svg(String text) {
        StringBuilder s = new StringBuilder("<svg xmlns='http://www.w3.org/2000/svg' width='170' height='56' viewBox='0 0 170 56'><rect width='170' height='56' fill='#eef2ff'/>");
        for (int i = 0; i < 6; i++)
            s.append(String.format("<line x1='%d' y1='%d' x2='%d' y2='%d' stroke='#%s' stroke-width='1.5'/>",
                    rnd.nextInt(170), rnd.nextInt(56), rnd.nextInt(170), rnd.nextInt(56), COLORS[rnd.nextInt(COLORS.length)]));
        for (int i = 0; i < text.length(); i++) {
            int x = 14 + i * 28, y = 37 + rnd.nextInt(10) - 5, rot = rnd.nextInt(41) - 20;
            s.append(String.format("<text x='%d' y='%d' font-size='30' font-weight='700' font-family='Arial,sans-serif' fill='#%s' transform='rotate(%d %d %d)'>%c</text>",
                    x, y, COLORS[rnd.nextInt(COLORS.length)], rot, x, y, text.charAt(i)));
        }
        return s.append("</svg>").toString();
    }
}