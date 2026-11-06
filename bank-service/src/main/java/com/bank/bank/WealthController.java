package com.bank.bank;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class WealthController {
    private final CardService cardSvc;
    private final MarketService market;
    private final InvestService invest;
    private final HoldingRepository holdings;
    private final PinService pins;

    public record IssueCardReq(String accountNumber, String type, String network) {}
    public record BuyReq(String accountNumber, String asset, BigDecimal amount, boolean sip, String pin) {}
    public record SellReq(String accountNumber, String asset, BigDecimal units, String pin) {}
    public record HoldingView(String asset, String name, String category, String unit, BigDecimal units,
                              BigDecimal invested, BigDecimal price, BigDecimal value, BigDecimal pnl, BigDecimal sipAmount) {}
    public record CvvReq(String pin) {}
    // ----- cards -----
    @GetMapping("/cards")
    public List<Card> cards(Authentication a) { return cardSvc.mine(a.getName()); }

    @PostMapping("/cards/{id}/toggle")
    public Card toggle(Authentication a, @PathVariable Long id) { return cardSvc.toggle(a.getName(), id); }

    // ----- market -----
    @GetMapping("/market")
    public List<MarketService.Quote> quotes() { return market.quotes(); }

    @GetMapping("/market/{code}/history")
    public List<MarketService.Point> history(@PathVariable String code, @RequestParam(defaultValue = "30") int days) {
        return market.history(code, days);
    }

    // ----- investments -----
    @GetMapping("/investments")
    public List<HoldingView> mine(Authentication a) {
        return holdings.findByOwner(a.getName()).stream().map(this::view).toList();
    }

    @PostMapping("/investments/buy")
    public HoldingView buy(Authentication a, @RequestBody BuyReq r) {
        pins.verify(a.getName(), r.pin());
        return view(invest.buy(a.getName(), r.accountNumber(), r.asset(), r.amount(), r.sip()));
    }

    @PostMapping("/investments/sell")
    public Map<String, String> sell(Authentication a, @RequestBody SellReq r) {
        pins.verify(a.getName(), r.pin());
        invest.sell(a.getName(), r.accountNumber(), r.asset(), r.units());
        return Map.of("message", "Sold");
    }

    @PostMapping("/cards/{id}/cvv")
    public Map<String, String> cvv(Authentication a, @PathVariable Long id, @RequestBody CvvReq r) {
        pins.verify(a.getName(), r.pin());
        return Map.of("cvv", cardSvc.cvv(a.getName(), id));
    }

    private HoldingView view(Holding h) {
        MarketService.Asset as = market.find(h.getAsset());
        BigDecimal price = market.priceNow(as);
        BigDecimal value = h.getUnits().multiply(price).setScale(2, RoundingMode.HALF_UP);
        return new HoldingView(h.getAsset(), as.name(), as.category(), as.unit(), h.getUnits(),
                h.getInvested(), price, value, value.subtract(h.getInvested()), h.getSipAmount());
    }
}