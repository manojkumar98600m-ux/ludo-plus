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

## Supabase database setup

1. Open your Supabase project and choose **SQL Editor**.
2. Open `supabase/ludo-plus-setup.sql` in this repository, copy all of it, and run it in SQL Editor.
3. In the backend host (Render), keep `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured. Do not add the service-role key to Vercel or frontend code.
4. In Supabase Storage, confirm the `ludo-media` bucket exists. The SQL file creates it as a public media bucket for posted images and reels.
5. For email/password login, configure the frontend deployment with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy the frontend. These are different from the server service-role secret.

The SQL setup creates the tables used by the API (rooms, chat messages, posts, and reels) and enables row-level security so direct browser table access stays blocked. API operations that use the service-role key happen on the backend.

## Important — not production ready
This is a working frontend prototype, not a complete social/gaming service. It does not yet include real registration/OTP, secure profile management, online Ludo multiplayer, persistent chat, video uploads/streaming, real dating matching, age verification, voice/video calling, moderation workflows, or a secure admin backend.

PhonePe payments are deliberately disabled. Do not add merchant secrets to frontend code or commit them to GitHub. A real PhonePe integration requires official merchant onboarding, server-side payment initiation, signed callback/status verification, idempotency, and secure membership activation. The current API never activates payments.

Before public launch: implement and test authentication, database access policies, storage permissions, adult age assurance, blocking/reporting, privacy/terms, rate limits, admin role checks, and payment verification.
