import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT || 3000);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "LUDO PLUS" }));

app.get("/api/payment/merchant-config", (_req, res) => {
  const required = ["PHONEPE_MERCHANT_ID", "PHONEPE_SALT_KEY", "PHONEPE_SALT_INDEX"];
  const configured = required.every(key => Boolean(process.env[key]?.trim()));
  res.json({
    configured,
    paymentEnabled: false,
    status: configured ? "pending_server_side_payment_integration" : "pending_merchant_setup",
    membership: { amountRupees: 50, durationDays: 90 }
  });
});

app.get("/api/posts", (_req, res) => res.json({ posts: [] }));
app.get("/api/reels", (_req, res) => res.json({ reels: [] }));
app.post("/api/ludo/rooms", (_req, res) => res.status(501).json({ error: "Online multiplayer is not implemented yet." }));
app.post("/api/ludo/rooms/:roomCode/join", (_req, res) => res.status(501).json({ error: "Room joining is not implemented yet." }));

app.listen(port, "0.0.0.0", () => console.log(`LUDO PLUS API listening on ${port}`));