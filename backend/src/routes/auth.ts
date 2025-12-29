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
		};

		return c.json({
			email: decoded.email,
			name: decoded.name,
			tokenIdentifier: decoded.tokenIdentifier,
			electionId: decoded.electionId,
		});
	} catch (err) {
		return c.json({ error: "Invalid token" }, 401);
	}
});

export { authRoutes };
