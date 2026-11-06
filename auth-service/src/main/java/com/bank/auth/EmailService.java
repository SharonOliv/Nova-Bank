package com.bank.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class EmailService {
    @Value("${mail.api-key:}") private String apiKey;
    @Value("${mail.sender:}") private String sender;
    @Value("${mail.sender-name:NovaBank}") private String senderName;
    @Value("${mail.api-url:https://api.brevo.com/v3/smtp/email}") private String apiUrl;
    private final HttpClient http = HttpClient.newHttpClient();

    public void send(String to, String subject, String html) {
        if (apiKey.isBlank() || sender.isBlank()) {   // local dev only
            System.out.println("[DEV EMAIL] To: " + to + " | " + subject + " | " + html.replaceAll("<[^>]+>", " ").trim());
            return;
        }
        String body = "{\"sender\":{\"name\":\"" + esc(senderName) + "\",\"email\":\"" + esc(sender) + "\"},"
                + "\"to\":[{\"email\":\"" + esc(to) + "\"}],"
                + "\"subject\":\"" + esc(subject) + "\",\"htmlContent\":\"" + esc(html) + "\"}";
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(apiUrl))
                    .header("api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .header("accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                System.err.println("Email API error " + res.statusCode() + ": " + res.body());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not send email. Please try again later");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            System.err.println("Email send failed: " + e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not send email. Please try again later");
        }
    }

    private static String esc(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}