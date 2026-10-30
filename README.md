# LUDO PLUS — starter project

Premium-style React + TypeScript web starter for the LUDO PLUS concept.

## Run locally
1. Install Node.js (LTS) and npm.
2. In this folder run `npm install`.
3. Run `npm run dev` and open the local Vite URL.
4. Run `npm run build` to create the frontend `dist/` folder.
5. Optional API: `npm run server` (defaults to port 3000).

## Included
- Home dashboard and responsive navigation
- Ludo dice/board UI demo
- Dating profile-card demo (sample profiles only)
- Reels preview demo
- Local chat UI demo
- ₹50 / 90-day membership modal
- Admin overview placeholder
- Express API skeleton and starter PostgreSQL schema

## Important — not production ready
This is a working frontend prototype, not a complete social/gaming service. It does not yet include real registration/OTP, secure profile management, online Ludo multiplayer, persistent chat, video uploads/streaming, real dating matching, age verification, voice/video calling, moderation workflows, or a secure admin backend.

PhonePe payments are deliberately disabled. Do not add merchant secrets to frontend code or commit them to GitHub. A real PhonePe integration requires official merchant onboarding, server-side payment initiation, signed callback/status verification, idempotency, and secure membership activation. The current API never activates payments.

Before public launch: implement and test authentication, database access policies, storage permissions, adult age assurance, blocking/reporting, privacy/terms, rate limits, admin role checks, and payment verification.
