import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { SSOClient } from "./sso";
import { StudentValidator } from "./validator";

const app = new Hono();

// Middleware
app.use("*", logger());

// SSO ITB Client instance
const ssoClient = new SSOClient({
	baseUrl: process.env.SSO_ITB_URL || "https://login.itb.ac.id",
	clientId: process.env.SSO_CLIENT_ID || "",
	clientSecret: process.env.SSO_CLIENT_SECRET || "",
	callbackUrl: process.env.SSO_CALLBACK_URL || "",
});

// Student validator
const validator = new StudentValidator();

// Health check
app.get("/health", (c) => {
	return c.json({ status: "ok", service: "oracle" });
});

// Get SSO login URL
app.get("/auth/login-url", (c) => {
	const loginUrl = ssoClient.getLoginUrl();
	return c.json({ loginUrl });
});

// Handle SSO callback and validate student
app.post("/auth/validate", async (c) => {
	try {
		const { code } = await c.req.json();

		// Exchange code for tokens
		const tokens = await ssoClient.exchangeCode(code);

		// Get user info from SSO
		const userInfo = await ssoClient.getUserInfo(tokens.accessToken);

		// Validate student eligibility
		const validation = await validator.validateStudent(userInfo);

		if (!validation.isValid) {
			return c.json({ error: validation.reason }, 403);
		}

		return c.json({
			valid: true,
			studentId: userInfo.nim,
			faculty: userInfo.faculty,
			// Note: NIM should be hashed before being used as token identifier
		});
	} catch (error) {
		console.error("Validation error:", error);
		return c.json({ error: "Validation failed" }, 500);
	}
});

const port = process.env.ORACLE_PORT ? parseInt(process.env.ORACLE_PORT) : 3002;

console.log(`🔮 Oracle service running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});

export default app;
