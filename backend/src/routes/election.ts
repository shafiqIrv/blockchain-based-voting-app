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

		// Check for Admin Role manual authentication (optional)
		let bypassTimeCheck = false;
		const authHeader = c.req.header("Authorization");
		if (authHeader && authHeader.startsWith("Bearer ")) {
			const token = authHeader.substring(7);
			try {
				const jwt = await import("jsonwebtoken");
				const decoded = jwt.default.verify(token, process.env.JWT_SECRET || "default-secret") as any;
				if (decoded.role === "admin") {
					bypassTimeCheck = true;
				}
			} catch (e) {
				// Ignore invalid token, just treat as public
			}
		}

		const results = await fabricService.getResults(electionId, bypassTimeCheck);

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

/**
 * POST /api/election/:id/dates
 * Update election dates (Admin only)
 */
electionRoutes.post("/:id/dates", async (c) => {
	try {
		const electionId = c.req.param("id");
		const body = await c.req.json();
		const { startDate, endDate } = body;

		if (!startDate || !endDate) {
			return c.json({ error: "Start date and end date are required" }, 400);
		}

		const updatedElection = await fabricService.updateElectionDates(
			electionId,
			new Date(startDate),
			new Date(endDate)
		);

		return c.json(updatedElection);
	} catch (error: any) {
		console.error("Update election dates error:", error);
		return c.json(
			{ error: error.message || "Failed to update election dates" },
			500
		);
	}
});

/**
 * POST /api/election/:id/candidates
 * Add a new candidate (Admin only)
 */
electionRoutes.post("/:id/candidates", async (c) => {
	try {
		const electionId = c.req.param("id");
		const body = await c.req.json();

		// Basic validation
		if (!body.name || !body.vision) {
			return c.json({ error: "Name and Vision are required" }, 400);
		}

		const candidate = await fabricService.addCandidate(electionId, body);
		return c.json(candidate);
	} catch (error: any) {
		console.error("Add candidate error:", error);
		return c.json({ error: error.message }, 500);
	}
});

/**
 * DELETE /api/election/:id/candidates/:candidateId
 * Remove a candidate (Admin only)
 */
electionRoutes.delete("/:id/candidates/:candidateId", async (c) => {
	try {
		const electionId = c.req.param("id");
		const candidateId = c.req.param("candidateId");

		await fabricService.deleteCandidate(electionId, candidateId);
		return c.json({ success: true });
	} catch (error: any) {
		console.error("Delete candidate error:", error);
		return c.json({ error: error.message }, 500);
	}
});

/**
 * GET /api/election/:id/voters
 * Get list of voters and their status (Admin only)
 */
electionRoutes.get("/:id/voters", async (c) => {
	try {
		const electionId = c.req.param("id");

		// Manual Auth Check (Admin Only)
		const authHeader = c.req.header("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const token = authHeader.substring(7);
		const jwt = await import("jsonwebtoken");
		let userRole = "voter";
		try {
			const decoded = jwt.default.verify(token, process.env.JWT_SECRET || "default-secret") as any;
			userRole = decoded.role;
		} catch (e) {
			return c.json({ error: "Invalid token" }, 401);
		}

		if (userRole !== "admin") {
			return c.json({ error: "Forbidden: Admin access required" }, 403);
		}

		// 1. Fetch Users from Oracle
		const oracleUrl = process.env.ORACLE_URL || "http://localhost:3002";
		const response = await fetch(`${oracleUrl}/internal/users`, {
			headers: { "x-internal-secret": process.env.INTERNAL_SECRET || "internal-secret" }
		});

		if (!response.ok) {
			throw new Error("Failed to fetch users from Oracle");
		}

		const users = await response.json() as any[];

		// 2. Check Voting Status for each user
		const votersStatus = await Promise.all(users.map(async (u) => {
			// In Anonymous Voting, we track "Ballot Issued" (Attendance) as a proxy for participation.
			// We cannot know if they actually dropped the ballot in the box, but we know they picked one up.
			const hasAttended = await fabricService.checkAttendance(u.email);
			console.log(`[VoterStatus] Checking ${u.email} (${u.nim}): Attended=${hasAttended}`);

			return {
				nim: u.nim,
				name: u.name,
				faculty: u.faculty,
				role: u.role,
				hasVoted: hasAttended // Maps "Attendance" to "Has Voted" in the UI
			};
		}));

		return c.json(votersStatus);

	} catch (error: any) {
		console.error("Get voters error:", error);
		return c.json({ error: error.message || "Failed to get voters" }, 500);
	}
});

export { electionRoutes };
