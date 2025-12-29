import { Hono } from "hono";
import { fabricService } from "../services/fabric";

const electionRoutes = new Hono();

/**
 * GET /api/election/:id
 * Get election details
 */
electionRoutes.get("/:id", async (c) => {
	try {
		const electionId = c.req.param("id");
		const election = await fabricService.getElection(electionId);

		return c.json(election);
	} catch (error: any) {
		console.error("Get election error:", error);
		return c.json({ error: error.message || "Election not found" }, 404);
	}
});

/**
 * GET /api/election/:id/status
 * Get election status
 */
electionRoutes.get("/:id/status", async (c) => {
	try {
		const electionId = c.req.param("id");
		const status = await fabricService.getElectionStatus(electionId);

		return c.json(status);
	} catch (error: any) {
		console.error("Get election status error:", error);
		return c.json({ error: error.message || "Election not found" }, 404);
	}
});

/**
 * GET /api/election/:id/candidates
 * Get candidates for an election
 */
electionRoutes.get("/:id/candidates", async (c) => {
	try {
		const electionId = c.req.param("id");
		const candidates = await fabricService.getCandidates(electionId);

		return c.json({ candidates });
	} catch (error: any) {
		console.error("Get candidates error:", error);
		return c.json(
			{ error: error.message || "Failed to get candidates" },
			500
		);
	}
});

/**
 * GET /api/election/:id/results
 * Get election results (only after election ends)
 */
electionRoutes.get("/:id/results", async (c) => {
	try {
		const electionId = c.req.param("id");
		const results = await fabricService.getResults(electionId);

		return c.json(results);
	} catch (error: any) {
		console.error("Get results error:", error);

		if (error.message.includes("not available")) {
			return c.json({ error: error.message }, 403);
		}

		return c.json({ error: error.message || "Failed to get results" }, 500);
	}
});

/**
 * GET /api/election/current
 * Get current active election
 */
electionRoutes.get("/", async (c) => {
	try {
		const electionId = process.env.CURRENT_ELECTION_ID || "election-2024";
		const election = await fabricService.getElection(electionId);

		return c.json(election);
	} catch (error: any) {
		console.error("Get current election error:", error);
		return c.json({ error: "No active election found" }, 404);
	}
});

export { electionRoutes };
