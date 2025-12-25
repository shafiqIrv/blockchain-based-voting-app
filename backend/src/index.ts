import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Import routes (to be implemented)
// import { authRoutes } from "./routes/auth";
// import { voteRoutes } from "./routes/vote";
// import { electionRoutes } from "./routes/election";
// import { verifyRoutes } from "./routes/verify";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
	"*",
	cors({
		origin: ["http://localhost:3000"], // Frontend URL
		credentials: true,
	})
);

// Health check
app.get("/health", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes (to be implemented)
// app.route("/api/auth", authRoutes);
// app.route("/api/vote", voteRoutes);
// app.route("/api/election", electionRoutes);
// app.route("/api/verify", verifyRoutes);

// Root route
app.get("/", (c) => {
	return c.json({
		message: "Voting Blockchain API",
		version: "1.0.0",
		endpoints: {
			health: "/health",
			auth: "/api/auth/*",
			vote: "/api/vote/*",
			election: "/api/election/*",
			verify: "/api/verify/*",
		},
	});
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

console.log(`🚀 Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});

export default app;
