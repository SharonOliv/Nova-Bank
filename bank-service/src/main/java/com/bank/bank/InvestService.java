package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class InvestService {
    private final HoldingRepository holdings;
    private final AccountService bank;
    private final MarketService market;

    @Transactional
    public Holding buy(String user, String acc, String code, BigDecimal amt, boolean sip) {
        amt = bank.check(amt);
        if (amt.compareTo(BigDecimal.TEN) < 0) throw bad("Minimum investment is ₹10");
        MarketService.Asset asset = market.find(code);
        Account a = bank.lockOwned(user, acc);
        BigDecimal price = market.priceNow(asset);
        BigDecimal units = amt.divide(price, 6, RoundingMode.HALF_UP);
        bank.debit(a, amt, (sip ? "SIP: " : "Invested in ") + asset.name() + " (" + units.toPlainString() + " " + asset.unit() + ")");
        Holding h = holdings.lockByOwnerAndAsset(user, asset.code()).orElseGet(() -> {
            Holding n = new Holding();
            n.setOwner(user);
            n.setAsset(asset.code());
            return n;
        });
        h.setUnits(h.getUnits().add(units));
        h.setInvested(h.getInvested().add(amt));
        if (sip) h.setSipAmount(amt);
        return holdings.save(h);
    }

    @Transactional
    public void sell(String user, String acc, String code, BigDecimal units) {
        if (units == null || units.signum() <= 0) throw bad("Enter units to sell");
        MarketService.Asset asset = market.find(code);
        Holding h = holdings.lockByOwnerAndAsset(user, asset.code())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "You don't hold this asset"));
        if (h.getUnits().compareTo(units) < 0) throw bad("You only hold " + h.getUnits().toPlainString() + " " + asset.unit());
        Account a = bank.lockOwned(user, acc);
        BigDecimal value = units.multiply(market.priceNow(asset)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal remaining = h.getUnits().subtract(units);
        BigDecimal ratio = remaining.divide(h.getUnits(), 10, RoundingMode.HALF_UP);
        h.setInvested(h.getInvested().multiply(ratio).setScale(2, RoundingMode.HALF_UP));
        h.setUnits(remaining);
        bank.credit(a, value, "Sold " + asset.name() + " (" + units.toPlainString() + " " + asset.unit() + ")");
        if (remaining.signum() == 0) holdings.delete(h); else holdings.save(h);
    }

    private ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
}