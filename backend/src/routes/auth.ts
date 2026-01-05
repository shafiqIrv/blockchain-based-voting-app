import { Hono } from "hono";
import { fabricService } from "../services/fabric";
import { blindSignatureService } from "../services/blind-signature";
import { getUser, authMiddleware } from "../middleware/auth";

const authRoutes = new Hono();

// Proxy Configuration
const ORACLE_URL = process.env.ORACLE_URL || "http://localhost:3002";

/**
 * POST /api/auth/login
 * Proxy to Oracle Login
 */
authRoutes.post("/login", async (c) => {
	try {
		const body = await c.req.json();
		const response = await fetch(`${ORACLE_URL}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		const data = await response.json();
		return c.json(data, response.status as any);
	} catch (error: any) {
		console.error("Login proxy error:", error);
		return c.json({ error: "Login service unavailable" }, 503);
	}
});

/**
 * POST /api/auth/register
 * Proxy to Oracle Register
 */
authRoutes.post("/register", async (c) => {
	try {
		const body = await c.req.json();
		const response = await fetch(`${ORACLE_URL}/auth/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		const data = await response.json();
		return c.json(data, response.status as any);
	} catch (error: any) {
		console.error("Register proxy error:", error);
		return c.json({ error: "Registration service unavailable" }, 503);
	}
});

/**
 * GET /api/auth/faculties
 * Proxy to Oracle Faculties
 */
authRoutes.get("/faculties", async (c) => {
	try {
		const response = await fetch(`${ORACLE_URL}/auth/faculties`);
		const data = await response.json();
		return c.json(data, response.status as any);
	} catch (error: any) {
		console.error("Faculties proxy error:", error);
		return c.json({ error: "Service unavailable" }, 503);
	}
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
authRoutes.get("/me", authMiddleware, async (c) => {
	const user = getUser(c);
	return c.json({
		email: user.email,
		name: user.name,
		tokenIdentifier: user.tokenIdentifier,
		electionId: user.electionId,
		// @ts-ignore - 'major' might be missing from type but present in token
		major: user['major'],
		role: user.role
	});
});

/**
 * POST /api/auth/register-voting
 * Register for voting (Get Blind Signature)
 * 
 * 1. User authenticates with JWT
 * 2. User provides BLINDED token (number)
 * 3. Server signs it and returns signature
 * 4. Server marks user as "registered" so they can't get another signature
 */
// Temporary in-memory store is replaced by fabricService.attendance
// const registeredUsers = new Set<string>();

authRoutes.post("/register-voting", authMiddleware, async (c) => {
	try {
		console.log("[RegisterVoting] Request received");
		const user = getUser(c);
		console.log(`[RegisterVoting] User: ${user.email}`);

		// Check if user has already received a ballot (Attendance)
		const hasAttended = await fabricService.checkAttendance(user.email);
		if (hasAttended) {
			console.log(`[RegisterVoting] User ${user.email} already registered`);
			return c.json({ error: "User already registered for voting" }, 403);
		}

		const body = await c.req.json().catch(err => {
			console.error("[RegisterVoting] Failed to parse JSON body:", err);
			return null;
		});

		if (!body) {
			return c.json({ error: "Invalid JSON body" }, 400);
		}

		const { blindedToken } = body;
		console.log(`[RegisterVoting] Blinded Token: ${blindedToken}`);

		if (!blindedToken) {
			return c.json({ error: "Blinded token required" }, 400);
		}

		// Sign the blinded token
		console.log("[RegisterVoting] Signing token...");
		const blindSignature = blindSignatureService.signBlinded(blindedToken);
		console.log("[RegisterVoting] Token signed successfully");

		// Record Attendance (Ballot Issued)
		await fabricService.recordAttendance(user.email);

		const publicKey = blindSignatureService.getPublicKey();
		console.log("[RegisterVoting] Returning response", { blindSignature, publicKey });

		return c.json({
			success: true,
			blindSignature,
			publicKey
		});

	} catch (error: any) {
		console.error("Blind signature error:", error);
		// Ensure we return JSON even on error
		return c.json({ error: "Failed to register: " + error.message }, 500);
	}
});

/**
 * GET /api/auth/voting-keys
 * Public endpoint to get admin public key
 */
authRoutes.get("/voting-keys", (c) => {
	return c.json({
		publicKey: blindSignatureService.getPublicKey()
	});
});

export { authRoutes };
