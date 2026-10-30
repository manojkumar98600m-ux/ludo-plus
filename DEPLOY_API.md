# LUDO PLUS deployment and account setup

## Frontend on Vercel
Set these environment variables in Vercel → Project → Settings → Environment Variables, then redeploy:

- `VITE_API_URL`: `https://ludo-plus-api.onrender.com` (without trailing slash).
- `VITE_SUPABASE_URL`: Supabase Project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase publishable/anon key (safe for browser use when RLS is enabled).

Never put the Supabase service-role key in Vercel, browser code, or GitHub.

## Enable email login
1. Open Supabase Dashboard → Authentication → Providers → Email and enable Email.
2. Configure Site URL and allowed redirect URLs for `https://ludo-plus-silk.vercel.app`.
3. If email confirmation is enabled, users must confirm the email before logging in.
4. Deploy the Vercel frontend again after adding the environment variables.

## Profile editing
The current profile editor saves display name and bio in the signed-in user's Supabase Auth metadata. It does not yet create a public profile directory or real dating matches. No date of birth or identity document is collected by this prototype.

## Backend on Render
1. Deploy the `render.yaml` Blueprint using repository `manojkumar98600m-ux/ludo-plus`.
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only to the Render service environment.
3. In Supabase SQL Editor, run `supabase/ludo-plus-schema.sql` for persistent chat, posts, and reels.
4. Check `https://ludo-plus-api.onrender.com/api/health` for status `ok`.

## Current limits and safety
- Email/password signup and login are implemented; they remain inactive until the Vercel Supabase variables are configured.
- Display name and bio can be edited after login and are saved to Auth user metadata.
- Dating profiles shown are fictional demo cards. Likes are local-only and are not delivered to other users. The 18+ checkbox is self-declaration only, not age verification.
- Do not launch real dating/matching until reliable age assurance, reporting, blocking, moderation, and privacy controls are implemented.
- Ludo rooms and game state remain in server memory; Render restarts clear active rooms. Room sync uses polling, not WebSockets.
- PhonePe payments remain disabled until official merchant onboarding and server-side payment verification are complete. No test/demo payment is marked successful.
