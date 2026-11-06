package com.bank.bank;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class MarketService {
    public record Asset(String code, String name, String category, String unit, double base, double vol, double phase) {}
    public record Quote(String code, String name, String category, String unit, double price, double change) {}
    public record Point(String date, double price) {}

    // Prices are SIMULATED (smooth deterministic curves), not real market data.
    private static final List<Asset> ASSETS = List.of(
        new Asset("GOLD",      "Gold 24K",              "METAL",     "gram", 11500, 0.050, 0.3),
        new Asset("SILVER",    "Silver",                "METAL",     "gram",   165, 0.070, 1.1),
        new Asset("PLATINUM",  "Platinum",              "METAL",     "gram",  4300, 0.060, 2.0),
        new Asset("JEWELLERY", "Jewellery Gold Plan",   "JEWELLERY", "gram", 11650, 0.050, 0.3),
        new Asset("NIFTY50",   "Nifty 50 Index Fund",   "MF",        "unit",   215, 0.060, 0.7),
        new Asset("FLEXICAP",  "Flexi Cap Fund",        "MF",        "unit",    78, 0.080, 1.6),
        new Asset("LIQUID",    "Liquid Fund",           "MF",        "unit",  1250, 0.004, 2.5));

    public Asset find(String code) {
        return ASSETS.stream().filter(a -> a.code().equalsIgnoreCase(code)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown asset"));
    }

    private double nowDays() { return System.currentTimeMillis() / 86_400_000.0; }

    private double at(Asset a, double d) {
        double f = a.vol() * (0.6 * Math.sin(d * 0.21 + a.phase()) + 0.4 * Math.sin(d * 0.9 + a.phase() * 2));
        return Math.round(a.base() * (1 + f) * 100.0) / 100.0;
    }

    public BigDecimal priceNow(Asset a) {
        return BigDecimal.valueOf(at(a, nowDays())).setScale(2, RoundingMode.HALF_UP);
    }

    public List<Quote> quotes() {
        double d = nowDays();
        List<Quote> out = new ArrayList<>();
        for (Asset a : ASSETS) {
            double p = at(a, d), prev = at(a, d - 1);
            out.add(new Quote(a.code(), a.name(), a.category(), a.unit(), p,
                    Math.round((p - prev) / prev * 10000.0) / 100.0));
        }
        return out;
    }

    public List<Point> history(String code, int days) {
        Asset a = find(code);
        days = Math.max(1, Math.min(days, 365));
        double d = nowDays();
        List<Point> pts = new ArrayList<>();
        for (int i = days; i >= 0; i--)
            pts.add(new Point(LocalDate.now().minusDays(i).toString(), at(a, d - i)));
        return pts;
    }
}