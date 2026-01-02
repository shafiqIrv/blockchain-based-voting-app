import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { Database } from "./db";
import { StudentValidator } from "./validator";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
	"*",
	cors({
		origin: ["http://localhost:3000"],
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "GET", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	})
);

// Local Database instance
const db = new Database();

// Student validator
const validator = new StudentValidator();

// Health check
app.get("/health", (c) => {
	return c.json({ status: "ok", service: "oracle", auth: "local-jwt" });
});

// Authentication endpoint (Replaces SSO)
app.post("/auth/login", async (c) => {
	try {
		const { nim, password } = await c.req.json();

		if (!nim || !password) {
			return c.json({ error: "NIM and password are required" }, 400);
		}

		// Authenticate against local DB
		const userInfo = await db.authenticate(nim, password);

		if (!userInfo) {
			return c.json({ error: "Invalid NIM or password" }, 401);
		}

		// Validate student eligibility
		const validation = await validator.validateStudent(userInfo);

		if (!validation.isValid) {
			return c.json({ error: validation.reason }, 403);
		}

		// GENERATE JWT Compatible with Backend
		const secret = new TextEncoder().encode(
			process.env.JWT_SECRET || "default-secret"
		);

		const tokenIdentifier = randomUUID();
		const electionId = process.env.CURRENT_ELECTION_ID || "election-2024";

		const token = await new SignJWT({
			email: userInfo.email,
			name: userInfo.name,
			tokenIdentifier: tokenIdentifier,
			electionId: electionId,
		})
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime("24h")
			.sign(secret);

		return c.json({
			valid: true,
			token,
			tokenId: tokenIdentifier,
			user: {
				name: userInfo.name,
				email: userInfo.email,
				tokenIdentifier: tokenIdentifier,
				electionId: electionId,
				nim: userInfo.nim,
				faculty: userInfo.faculty
			}
		});
	} catch (error) {
		console.error("Login error:", error);
		return c.json({ error: "Login process failed" }, 500);
	}
});

const port = process.env.ORACLE_PORT ? parseInt(process.env.ORACLE_PORT) : 3002;

console.log(`🔮 Oracle service running on http://localhost:${port} (Local Auth + JWT Mode)`);

serve({
	fetch: app.fetch,
	port,
});

export default app;
