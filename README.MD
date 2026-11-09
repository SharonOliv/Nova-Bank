# NovaBank Banking Dashboard

A mini retail-banking platform built with Spring Boot microservices, React and PostgreSQL. It simulates the full customer journey, from sign-up and KYC to accounts, cards, PIN-protected transfers, loans and investments, with an admin back office that approves every sensitive request.

**Live demo:** https://novabank-steel.vercel.app

> The backend runs on a free tier, so the first request after a period of inactivity can take about a minute while the services wake up. All data in the demo is fake.

## Demo login

| Role | Email | Password |
|---|---|---|
| Customer | `alice@demo.com` | `Demo@1234` |

Transaction PIN for demo customers: `4826`. The admin account is not shared publicly.

## About the project

NovaBank demonstrates secure, data-driven application design:

- **Microservices:** a separate Auth Service and Banking Service, each with its own database.
- **Stateless security:** JWT authentication, BCrypt password hashing and role-based access (USER and ADMIN).
- **Maker-checker workflow:** customers request, admins approve. This applies to KYC, new accounts, cards, loans, detail changes and account deletion.
- **Safe money handling:** transfers run in a single database transaction with row-level locking to prevent double-spending.

## Features

**Customer**
- Sign-up with captcha, login and password change
- Three-step KYC form with field-level validation and captcha checks
- Primary Savings account created after KYC approval; extra Savings, Current and Merchant accounts by request
- Debit, Credit and Prepaid cards; a replacement debit card blocks the old one
- Deposit, transfer and self-transfer, each confirmed with a 4-digit PIN (3 wrong attempts lock it for 15 minutes)
- Transaction history with timestamps across all accounts
- Loan applications with an EMI calculator
- Investments in gold, silver, platinum and mutual funds with price and allocation charts (simulated prices)
- Offers with promo codes, FAQs, profile, PIN management and account deletion request

**Admin**
- Approve KYC, detail changes, loans, new accounts and cards
- Process account deletions
- View users, accounts, all transactions and bank-wide charts

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot, Spring Security, Spring Data JPA |
| Auth | JWT, BCrypt |
| Database | PostgreSQL (Docker locally, Neon in the cloud) |
| Frontend | React, Vite, React Router, Axios, Recharts |
| Hosting | Vercel (frontend), Render (services), Neon (database) |

## Architecture

```
React (Vercel) ──► Auth Service (8081) ──► auth_db
      │
      └──────────► Banking Service (8082) ─► bank_db
```

The Auth Service issues the JWT at login. The Banking Service verifies it with the same secret.

## Run locally

1. `docker compose up -d`
2. `cd auth-service && ./mvnw spring-boot:run`
3. `cd bank-service && ./mvnw spring-boot:run`
4. `cd frontend && npm install && npm run dev`

Open http://localhost:5173. The admin user `admin@novabank.com` is created on the first start of the Auth Service.

## Environment variables

`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_PASSWORD`, `CORS_ORIGIN`, `DEMO_SEED`, `VITE_AUTH_URL`, `VITE_BANK_URL`

Local defaults exist for development only. Use your own values for anything deployed.

## Limitations

Market prices are simulated, loan repayments are not processed, and KYC has no document upload or external verification.
