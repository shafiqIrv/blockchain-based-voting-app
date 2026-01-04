import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "dotenv/config";

// Import routes
import { authRoutes } from "./routes/auth";
import { voteRoutes } from "./routes/vote";
import { electionRoutes } from "./routes/election";
import { uploadRoutes } from "./routes/upload";

// Import services
import { fabricService } from "./services/fabric";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
	"*",
	cors({
		origin: [
			process.env.FRONTEND_URL || "http://localhost:3000",
			"http://localhost:3000",
		],
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	})
);

// Health check
app.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		service: "voting-backend",
	});
});

// API Routes
app.route("/api/auth", authRoutes);
app.route("/api/vote", voteRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/vote", voteRoutes);
app.route("/api/election", electionRoutes);
app.route("/api/upload", uploadRoutes);

// Static files
import { serveStatic } from "@hono/node-server/serve-static";
app.use("/uploads/*", serveStatic({ root: "./public" }));

// Root route
app.get("/", (c) => {
	return c.json({
		message: "🗳️ Pemira KM ITB Blockchain API",
		version: "1.0.0",
		endpoints: {
			health: "/health",
			auth: {
				login: "GET /api/auth/login",
				loginUrl: "GET /api/auth/login-url",
				callback: "GET /api/auth/callback",
				me: "GET /api/auth/me",
			},
			election: {
				current: "GET /api/election",
				byId: "GET /api/election/:id",
				status: "GET /api/election/:id/status",
				candidates: "GET /api/election/:id/candidates",
				results: "GET /api/election/:id/results",
			},
			vote: {
				submit: "POST /api/vote/submit",
				status: "GET /api/vote/status",
				verify: "GET /api/vote/verify/:tokenId",
			},
		},
	});
});

// Initialize services
async function init() {
	try {
		await fabricService.connect();
		console.log("✅ Services initialized");
	} catch (error) {
		console.error("Failed to initialize services:", error);
	}
}

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Start server
init().then(() => {
	console.log(`
  🗳️  Pemira KM ITB Blockchain API
  ────────────────────────────
  📍 Server:  http://localhost:${port}
  📍 Health:  http://localhost:${port}/health
  📍 Docs:    http://localhost:${port}/
  ────────────────────────────
  `);

	serve({
		fetch: app.fetch,
		port,
	});
});

export default app;
