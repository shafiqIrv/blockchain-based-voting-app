import { Hono } from "hono";
import { microsoftOAuth } from "../services/microsoft";
import { tokenService } from "../services/token";

const authRoutes = new Hono();

/**
 * GET /api/auth/login
 * Redirect to Microsoft OAuth login
 */
authRoutes.get("/login", (c) => {
	const state = Math.random().toString(36).substring(2);
	const loginUrl = microsoftOAuth.getLoginUrl(state);
	return c.redirect(loginUrl);
});

/**
 * GET /api/auth/login-url
 * Get the Microsoft OAuth login URL (for frontend redirect)
 */
authRoutes.get("/login-url", (c) => {
	const loginUrl = microsoftOAuth.getLoginUrl();
	return c.json({ loginUrl });
});

/**
 * GET /api/auth/callback
 * Handle Microsoft OAuth callback
 */
authRoutes.get("/callback", async (c) => {
	const code = c.req.query("code");
	const error = c.req.query("error");
	const errorDescription = c.req.query("error_description");

	if (error) {
		console.error("OAuth error:", error, errorDescription);
		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
		return c.redirect(
			`${frontendUrl}/login?error=${encodeURIComponent(error)}`
		);
	}

	if (!code) {
		return c.json({ error: "No authorization code provided" }, 400);
	}

	try {
		// Exchange code for tokens
		const tokens = await microsoftOAuth.exchangeCodeForTokens(code);

		// Get user info from Microsoft Graph
		const userInfo = await microsoftOAuth.getUserInfo(tokens.access_token);
		const email = microsoftOAuth.getEmail(userInfo);

		// Validate ITB student email
		if (!microsoftOAuth.isValidITBStudent(email)) {
			const frontendUrl =
				process.env.FRONTEND_URL || "http://localhost:3000";
			return c.redirect(
				`${frontendUrl}/login?error=invalid_domain&message=${encodeURIComponent(
					"Hanya mahasiswa ITB (@mahasiswa.itb.ac.id) yang dapat mengakses sistem voting"
				)}`
			);
		}

		// Generate voting tokens
		const electionId = process.env.CURRENT_ELECTION_ID || "election-2024";
		const votingTokens = tokenService.generateVotingTokens(
			email,
			userInfo.displayName,
			electionId
		);

		// Redirect to frontend with JWT
		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
		return c.redirect(
			`${frontendUrl}/auth/callback?token=${votingTokens.jwt}&tokenId=${votingTokens.tokenIdentifier}`
		);
	} catch (err) {
		console.error("Auth callback error:", err);
		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
		return c.redirect(`${frontendUrl}/login?error=auth_failed`);
	}
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
authRoutes.get("/me", async (c) => {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const token = authHeader.substring(7);
		const jwtModule = await import("jsonwebtoken");
		const decoded = jwtModule.default.verify(
			token,
			process.env.JWT_SECRET || "default-secret"
		) as {
			email: string;
			name: string;
			tokenIdentifier: string;
			electionId: string;
			role: "admin" | "voter";
		};

		return c.json({
			email: decoded.email,
			name: decoded.name,
			tokenIdentifier: decoded.tokenIdentifier,
			electionId: decoded.electionId,
			role: decoded.role,
		});
	} catch (err) {
		return c.json({ error: "Invalid token" }, 401);
	}
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
import { fabricService } from "../services/fabric";
import { blindSignatureService } from "../services/blind-signature";
import { getUser, authMiddleware } from "../middleware/auth";

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
