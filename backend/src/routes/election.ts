import { Hono } from "hono";
import { fabricService } from "../services/fabric";
import { authMiddleware, getUser } from "../middleware/auth";

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

/*
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

		// 1. Get Basic Results from Chaincode
		const results = await fabricService.getResults(electionId);

		// 2. Calculate Votes By Major (Enrichment)
		try {
			// B. Fetch Ballots from Chaincode
			const rawBallots = await fabricService.getBallots(electionId);

			// C. Aggregate Votes
			const votesByMajor: Record<string, Record<string, number>> = {};

			for (const ballot of rawBallots) {
				try {
					// Decrypt: base64 -> JSON
					const jsonStr = Buffer.from(ballot.encryptedVote, 'base64').toString();
					const voteData = JSON.parse(jsonStr);
					const candidateIds = voteData.candidateIds;

					if (Array.isArray(candidateIds) && candidateIds.length > 0) {
						const firstChoiceId = candidateIds[0];

						const major = voteData.major || "Unknown";

						if (!votesByMajor[major]) {
							votesByMajor[major] = {};
						}
						if (!votesByMajor[major][firstChoiceId]) {
							votesByMajor[major][firstChoiceId] = 0;
						}
						votesByMajor[major][firstChoiceId]++;
					}
				} catch (e) {
					// Skip malformed/failed decryption
				}
			}

			results.votesByMajor = votesByMajor;

		} catch (calcError) {
			console.error("Failed to calculate votesByMajor:", calcError);
		}

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
electionRoutes.post("/:id/dates", authMiddleware, async (c) => {
	try {
		const user = getUser(c);
		if (user.role !== "admin") {
			return c.json({ error: "Forbidden: Admin access required" }, 403);
		}

		const electionId = c.req.param("id");
		const body = await c.req.json();
		const { startDate, endDate } = body;

		console.log(`[UpdateDates] Request for ${electionId}`);
		console.log(`[UpdateDates] Payload:`, { startDate, endDate });

		if (!startDate || !endDate) {
			return c.json({ error: "Start date and end date are required" }, 400);
		}

		const updatedElection = await fabricService.updateElectionDates(
			electionId,
			new Date(startDate),
			new Date(endDate)
		);

		console.log(`[UpdateDates] New Election State:`, {
			start: updatedElection.startTime,
			end: updatedElection.endTime
		});

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
electionRoutes.post("/:id/candidates", authMiddleware, async (c) => {
	try {
		const user = getUser(c);
		if (user.role !== "admin") {
			return c.json({ error: "Forbidden: Admin access required" }, 403);
		}

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
electionRoutes.delete("/:id/candidates/:candidateId", authMiddleware, async (c) => {
	try {
		const user = getUser(c);
		if (user.role !== "admin") {
			return c.json({ error: "Forbidden: Admin access required" }, 403);
		}

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
			const hasParticipated = await fabricService.checkParticipation(u.email);

			return {
				nim: u.nim,
				name: u.name,
				faculty: u.faculty,
				major: u.major, // Include Major field
				role: u.role,
				hasIdentity: hasAttended, // Sudah ambil token/registrasi
				hasVoted: hasParticipated // Sudah konfirmasi mencoblos
			};
		}));

		return c.json(votersStatus);

	} catch (error: any) {
		console.error("Get voters error:", error);
		return c.json({ error: error.message || "Failed to get voters" }, 500);
	}
});



// Public Stats Endpoint
electionRoutes.get("/:id/stats", async (c) => {
	try {
		const electionId = c.req.param("id");

		// 1. Fetch Users from Oracle (Internal Server-to-Server)
		const oracleUrl = process.env.ORACLE_URL || "http://localhost:3002";
		const response = await fetch(`${oracleUrl}/internal/users`, {
			headers: { "x-internal-secret": process.env.INTERNAL_SECRET || "internal-secret" }
		});

		if (!response.ok) {
			throw new Error("Failed to fetch users from Oracle");
		}

		const users = await response.json() as any[];

		// 2. Aggregate Stats per Major (excluding admins)
		const statsByMajor: Record<string, { total: number; voted: number }> = {};

		// Parallelize checks for performance
		await Promise.all(users.map(async (u) => {
			// Skip admins to separate them from voter stats
			if (u.role === 'admin' || (u.major && u.major.toLowerCase() === 'administrator')) {
				return;
			}

			const major = u.major || "Unknown";
			const hasParticipated = await fabricService.checkParticipation(u.email);

			if (!statsByMajor[major]) {
				statsByMajor[major] = { total: 0, voted: 0 };
			}

			statsByMajor[major].total += 1;
			if (hasParticipated) {
				statsByMajor[major].voted += 1;
			}
		}));

		return c.json(statsByMajor);

	} catch (error: any) {
		console.error("Get stats error:", error);
		return c.json({ error: error.message || "Failed to get stats" }, 500);
	}
});

// Create Election Endpoint
electionRoutes.post("/", authMiddleware, async (c) => {
	try {
		const user = getUser(c);
		if (user.role !== "admin") {
			return c.json({ error: "Forbidden: Admin access required" }, 403);
		}

		const body = await c.req.json();
		const { id, name, startTime, endTime, candidates } = body;

		if (!id || !name || !startTime || !endTime || !candidates) {
			return c.json({ error: "Missing required fields" }, 400);
		}


		// Generate IDs for candidates if missing
		const { v4: uuidv4 } = await import("uuid");
		const candidatesWithIds = candidates.map((c: any) => ({
			...c,
			id: c.id || uuidv4()
		}));

		await fabricService.initElection(
			id,
			name,
			new Date(startTime),
			new Date(endTime),
			candidatesWithIds
		);

		return c.json({ success: true, message: "Election created successfully" });
	} catch (error: any) {
		console.error("Create election error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// IRV Result Endpoint
electionRoutes.get("/:id/irv", async (c) => {
	try {
		const electionId = c.req.param("id");

		// 1. Auth Check (Admin or Election Ended)
		const authHeader = c.req.header("Authorization");
		let isAdmin = false;

		if (authHeader && authHeader.startsWith("Bearer ")) {
			const token = authHeader.substring(7);
			const jwt = await import("jsonwebtoken");
			try {
				const decoded = jwt.default.verify(token, process.env.JWT_SECRET || "default-secret") as any;
				if (decoded.role === "admin") isAdmin = true;
			} catch (e) {
				// Ignore invalid token
			}
		}

		const election = await fabricService.getElection(electionId);
		if (election.status !== "ENDED" && !isAdmin) {
			return c.json({ error: "Results not available yet" }, 403);
		}

		// 2. Calculate IRV
		const rawBallots = await fabricService.getBallots(electionId);

		// Decrypt ballots
		const decryptedBallots: string[][] = [];
		for (const ballot of rawBallots) {
			try {
				// Vote is encrypted as base64(JSON)
				// Format: { candidateIds: string[], ... }
				const jsonStr = atob(ballot.encryptedVote);
				const voteData = JSON.parse(jsonStr);

				if (Array.isArray(voteData.candidateIds)) {
					decryptedBallots.push(voteData.candidateIds);
				}
			} catch (e) {
				console.warn("Failed to decrypt ballot:", ballot.tokenIdentifier);
			}
		}

		// Map candidate IDs from election data
		const candidateIds = election.candidates.map((c: any) => c.id);

		const { calculateIRV } = await import("../services/irv");
		const irvResult = calculateIRV(decryptedBallots, candidateIds);

		return c.json(irvResult);

	} catch (error: any) {
		console.error("Get IRV error:", error);
		return c.json({ error: error.message || "Failed to get IRV results" }, 500);
	}
});

export { electionRoutes };
