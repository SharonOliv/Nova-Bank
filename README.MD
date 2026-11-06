# NovaBank Banking Dashboard

Spring Boot microservices + React + PostgreSQL + JWT.

## Features
KYC onboarding, accounts and cards, PIN-protected transfers, loans, investments, admin approvals (maker-checker).

## Run locally
1. `docker compose up -d`
2. `cd auth-service && ./mvnw spring-boot:run`
3. `cd bank-service && ./mvnw spring-boot:run`
4. `cd frontend && npm install && npm run dev`

Admin: `admin@novabank.com` (password from `ADMIN_PASSWORD`, default for local use only).

## Environment variables
DB_URL, DB_USER, DB_PASSWORD, JWT_SECRET, ADMIN_PASSWORD, CORS_ORIGIN, MAIL_API_KEY, MAIL_SENDER, DEMO_SEED, VITE_AUTH_URL, VITE_BANK_URL