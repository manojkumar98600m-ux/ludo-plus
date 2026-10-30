# LUDO PLUS deployment and account setup

## Frontend on Vercel
Set these environment variables in Vercel → Project → Settings → Environment Variables, then redeploy:

- `VITE_API_URL`: your Render API URL, without trailing slash.
- `VITE_SUPABASE_URL`: Supabase Project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase publishable/anon key (safe for browser use when RLS is enabled).

Never put the Supabase service-role key in Vercel, browser code, or GitHub.

## Enable email login
1. Open Supabase Dashboard → Authentication → Providers → Email and enable Email.
2. Configure Site URL and allowed redirect URLs for your Vercel domain.
3. If email confirmation is enabled, users must confirm the email before logging in.
4. Deploy the Vercel frontend again after adding the environment variables.

## Backend on Render
1. Deploy the `render.yaml` Blueprint using repository `manojkumar98600m-ux/ludo-plus`.
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only to the Render service environment.
3. Check `https://YOUR-SERVICE.onrender.com/api/health` for status `ok`.

## Current limits
- Email/password signup and login UI is implemented; it is inactive until the Vercel Supabase variables are configured.
- The profile panel currently shows the authenticated email; full profile editing is still pending.
- Ludo rooms and game state remain in server memory; restarts clear active rooms.
- Room sync uses polling, not WebSockets.
- PhonePe payments remain disabled until official merchant onboarding and server-side payment verification are complete.
