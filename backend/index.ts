import { Hono } from "hono";
import { cors } from "hono/cors";
import { query, isMock } from "./db";

const app = new Hono();

// Enable CORS for our Vite local frontend (normally http://localhost:8080)
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// Health check endpoint
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: isMock ? "mock-fallback" : "postgresql",
    runtime: "bun",
    version: "1.0.0",
  });
});

// Jobs endpoint
app.get("/api/jobs", async (c) => {
  console.log("📥 GET /api/jobs requested");
  const data = await query("jobs");
  return c.json({ data });
});

// Candidates endpoint
app.get("/api/candidates", async (c) => {
  console.log("📥 GET /api/candidates requested");
  const data = await query("candidates");
  return c.json({ data });
});

// Offers endpoint
app.get("/api/offers", async (c) => {
  console.log("📥 GET /api/offers requested");
  const data = await query("offers");
  return c.json({ data });
});

const port = parseInt(process.env.PORT || "3000");
console.log(`🚀 Hono API Server running on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
