package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CardService {
    private final CardRepository cards;
    private final AccountRepository accounts;
    private final SecureRandom rnd = new SecureRandom();
    private final KycService kyc;

    public List<Card> mine(String user) { return cards.findByOwnerOrderByIdDesc(user); }

    @Transactional
    public Card issue(String user, String accountNumber, Card.Type type, Card.Network net) {
        accounts.findByAccountNumber(accountNumber)
                .filter(a -> a.getOwner().equals(user))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (cards.countByOwner(user) >= 15)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum 6 cards allowed");
        if (type == Card.Type.DEBIT)   // a new debit card replaces the old one on this account
        for (Card old : cards.findByAccountNumberAndType(accountNumber, Card.Type.DEBIT)) {
            old.setBlocked(true);
            old.setReplaced(true);
            cards.save(old);
        }
        Card c = new Card();
        c.setOwner(user);
        c.setAccountNumber(accountNumber);
        c.setType(type);
        c.setNetwork(net);
        c.setCardNumber(number(net));
        c.setHolder(kyc.find(user).map(Kyc::getFullName).orElse(user).toUpperCase());
        c.setExpiry(LocalDate.now().plusYears(5).format(DateTimeFormatter.ofPattern("MM/yy")));
        c.setCvv(String.format("%03d", rnd.nextInt(1000)));
        return cards.save(c);
    }

    @Transactional
    public Card toggle(String user, Long id) {
        Card c = cards.findByIdAndOwner(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found"));
        if (Boolean.TRUE.equals(c.getReplaced()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This card was replaced and can't be unblocked");
        c.setBlocked(!c.isBlocked());
        return cards.save(c);
    }

    private String number(Card.Network n) {
        String prefix = switch (n) { case VISA -> "4"; case MASTERCARD -> "5"; case RUPAY -> "6"; };
        String num;
        do {
            StringBuilder sb = new StringBuilder(prefix);
            while (sb.length() < 16) sb.append(rnd.nextInt(10));
            num = sb.toString();
        } while (cards.existsByCardNumber(num));
        return num;
    }

    @Transactional
    public String cvv(String user, Long id) {
        Card c = cards.findByIdAndOwner(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found"));
        if (c.revealCvv() == null) { c.setCvv(String.format("%03d", rnd.nextInt(1000))); cards.save(c); } // cards issued before this change
        return c.revealCvv();
    }
}