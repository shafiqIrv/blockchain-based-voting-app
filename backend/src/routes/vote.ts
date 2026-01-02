import { Hono } from "hono";
import { fabricService } from "../services/fabric";
import { authMiddleware, getUser } from "../middleware/auth";

const voteRoutes = new Hono();

/**
 * POST /api/vote/submit
 * Submit a vote (authenticated)
 */
voteRoutes.post("/submit", authMiddleware, async (c) => {
	try {
		const user = getUser(c);
		const body = await c.req.json();
		const { candidateId } = body;

		// Admins cannot vote
		if (user.role && user.role.includes("admin")) {
			return c.json({ error: "Administrators are not allowed to vote" }, 403);
		}

		if (!candidateId) {
			return c.json({ error: "Candidate ID is required" }, 400);
		}

		// Create encrypted vote (base64 encoded for demo)
		// In production, use proper asymmetric encryption
		const encryptedVote = btoa(
			JSON.stringify({
				candidateId,
				timestamp: new Date().toISOString(),
			})
		);

		const result = await fabricService.castVote(
			user.electionId,
			user.tokenIdentifier,
			encryptedVote
		);

		return c.json({
			success: true,
			message: "Vote submitted successfully",
			tokenIdentifier: user.tokenIdentifier,
		});
	} catch (error: any) {
		console.error("Vote submission error:", error);
		return c.json({ error: error.message || "Failed to submit vote" }, 400);
	}
});

/**
 * GET /api/vote/status
 * Check if current user has voted
 */
voteRoutes.get("/status", authMiddleware, async (c) => {
	try {
		const user = getUser(c);

		const hasVoted = await fabricService.hasVoted(
			user.electionId,
			user.tokenIdentifier
		);

		return c.json({
			hasVoted,
			tokenIdentifier: user.tokenIdentifier,
		});
	} catch (error: any) {
		console.error("Vote status error:", error);
		return c.json({ error: "Failed to check vote status" }, 500);
	}
});

/**
 * GET /api/vote/verify/:tokenId
 * Verify a vote exists on the blockchain
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
