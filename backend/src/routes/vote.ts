import { Hono } from "hono";
import { fabricService } from "../services/fabric";
import { authMiddleware, getUser } from "../middleware/auth";

const voteRoutes = new Hono();

import { blindSignatureService } from "../services/blind-signature";

/**
 * POST /api/vote/submit
 * Submit a vote
 * NOW SUPPORTS: Anonymous Voting via Blind Signatures
 */
voteRoutes.post("/submit", async (c) => {
	try {
		const body = await c.req.json();
		const { candidateIds, tokenIdentifier, signature } = body;

		if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
			return c.json({ error: "Candidate rankings are required" }, 400);
		}


		// New Anonymous Flow
		if (tokenIdentifier && signature) {

			// 1. Verify Blind Signature
			const isValid = blindSignatureService.verify(tokenIdentifier, signature);
			if (!isValid) {
				return c.json({ error: "Invalid voting token signature" }, 403);
			}

			// 2. Check used token (Double Voting Check)
			// In real app, check blockchain or scalable DB.
			// fabricService.hasVoted checks if the electionId + tokenIdentifier exists in World State.
			// We need electionId. It should be part of the request or constant since user is anonymous.
			const electionId = process.env.CURRENT_ELECTION_ID || "election-2024";

			const hasVoted = await fabricService.hasVoted(electionId, tokenIdentifier);
			if (hasVoted) {
				return c.json({ error: "Token has already voted" }, 403);
			}

			// 3. Create encrypted vote
			const encryptedVote = btoa(
				JSON.stringify({
					candidateIds,
					major: body.major,
					timestamp: new Date().toISOString(),
				})
			);

			// 4. Cast Vote
			await fabricService.castVote(
				electionId,
				tokenIdentifier,
				encryptedVote
			);

			return c.json({
				success: true,
				message: "Vote submitted successfully (Anonymous)",
				tokenIdentifier: tokenIdentifier,
			});

		} else {
			// Fallback to old authenticated flow? Or blocking it?
			// User requested anonymous. Let's enforce it or require auth if missing sig.
			// But we can't easily get user from request if no auth middleware...
			// Let's assume we migrated fully. If no signature, reject.
			return c.json({ error: "Voting requires a valid signed token" }, 401);
		}

	} catch (error: any) {
		console.error("Vote submission error:", error);
		return c.json({ error: error.message || "Failed to submit vote" }, 400);
	}
});

/**
 * POST /api/vote/confirm
 * Confirm participation (authenticated)
 * Called AFTER successful anonymous vote submission
 */
voteRoutes.post("/confirm", authMiddleware, async (c) => {
	try {
		const user = getUser(c);
		await fabricService.recordParticipation(user.email);
		return c.json({ success: true, message: "Participation confirmed" });
	} catch (error: any) {
		console.error("Vote confirmation error:", error);
		return c.json({ error: "Failed to confirm participation" }, 500);
	}
});

/**
 * GET /api/vote/status
 * Check if current user has voted (Authenticated)
 * Legacy/Status check for UI
 */
voteRoutes.get("/status", authMiddleware, async (c) => {
	try {
		// This only checks based on the OLD deterministic token from email
		// With blind signatures, the server DOES NOT KNOW the user's token.
		// So this endpoint cannot tell if the user has voted unless we store "hasVoted" flag on user profile
		// during registration or separately.
		// Actually, we store `registeredUsers` set in auth.ts. We can check that to say "Registered".
		// But we can't check "Has Voted" without breaking anonymity.

		// However, for the UI "You have voted" screen, the client should know this from local storage.
		// The server can only say "You are registered".

		const user = getUser(c);

		const hasVoted = await fabricService.checkParticipation(user.email);
		const hasIdentity = await fabricService.checkAttendance(user.email);

		return c.json({
			hasVoted,
			registered: hasIdentity,
			tokenIdentifier: "ANONYMOUS",
		});
	} catch (error: any) {
		console.error("Vote status error:", error);
		return c.json({ error: "Failed to check vote status" }, 500);
	}
});

/**
 * GET /api/vote/verify/:tokenId
 * Verify a vote exists on the blockchain
 * Public endpoint - anyone with a token can verify
 */
voteRoutes.get("/verify/:tokenId", async (c) => {
	try {
		const tokenId = c.req.param("tokenId");
		const electionId =
			c.req.query("electionId") ||
			process.env.CURRENT_ELECTION_ID ||
			"election-2024";

		const vote = await fabricService.getVote(electionId, tokenId);

		if (!vote) {
			return c.json({
				found: false,
				message: "Vote not found for this token",
			});
		}

		return c.json({
			found: true,
			vote: {
				tokenIdentifier: vote.tokenIdentifier,
				electionId: vote.electionId,
				timestamp: vote.timestamp,
				// Note: encryptedVote is not returned for privacy
			},
		});
	} catch (error: any) {
		console.error("Vote verification error:", error);
		return c.json({ error: "Failed to verify vote" }, 500);
	}
});

export { voteRoutes };
