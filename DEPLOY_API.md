# LUDO PLUS API deployment

The repository includes a Render Blueprint in `render.yaml`.

1. Open Render and choose **New → Blueprint**.
2. Connect the GitHub repository `manojkumar98600m-ux/ludo-plus`.
3. Select the `render.yaml` blueprint and deploy the `ludo-plus-api` web service.
4. When Render gives the service URL, check `https://YOUR-SERVICE.onrender.com/api/health`. It should return JSON with status `ok`.
5. In the Vercel project for the web app, add the environment variable `VITE_API_URL` with the Render service URL (no trailing slash), then redeploy the frontend.

## Current limitations

- Rooms and game state are stored in server memory. Restarting/redeploying the API clears active rooms.
- The current room sync uses polling (about every 2 seconds), not instant WebSocket updates.
- This is a prototype backend. Add persistent storage, authentication, rate limits and server-authoritative move validation before a public launch.
- PhonePe payments intentionally remain disabled until the merchant credentials and a verified server-side PhonePe integration are configured.
