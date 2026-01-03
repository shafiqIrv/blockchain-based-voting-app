import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { SQLiteDatabase } from "./database";
import { StudentValidator } from "./validator";
import { FACULTIES } from "./data";

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

// Local Persistent Database instance
const db = new SQLiteDatabase();

// Student validator
const validator = new StudentValidator();

// Health check
app.get("/health", (c) => {
	return c.json({ status: "ok", service: "oracle", auth: "sqlite-jwt" });
});

// Get Faculties and Majors
app.get("/auth/faculties", (c) => {
	return c.json(FACULTIES);
});

// Registration Endpoint
app.post("/auth/register", async (c) => {
	try {
		const body = await c.req.json();
		const { name, nim, email, password, faculty, major, campus, entry_year } = body;

		// 1. Basic Validation
		if (!name || !nim || !email || !password || !faculty || !major || !campus || !entry_year) {
			return c.json({ error: "All fields are required" }, 400);
		}

		// 2. Email Validation
		if (!email.endsWith("@mahasiswa.itb.ac.id")) {
			return c.json({ error: "Email must be @mahasiswa.itb.ac.id" }, 400);
		}

		// 3. Campus Validation
		const validCampuses = ["Ganesha", "Jatinangor", "Cirebon"];
		if (!validCampuses.includes(campus)) {
			return c.json({ error: "Invalid campus selection" }, 400);
		}

		// 4. NIM Structure Validation
		if (nim.length !== 8) {
			return c.json({ error: "NIM must be exactly 8 digits" }, 400);
		}

		// 5. NIM Header Validation (Faculty/Major Check)
		const selectedFaculty = FACULTIES.find(f => f.name === faculty);
		if (!selectedFaculty) {
			return c.json({ error: "Invalid faculty" }, 400);
		}

		const selectedMajor = selectedFaculty.majors.find(m => m.name === major);
		if (!selectedMajor) {
			return c.json({ error: `Invalid major for faculty ${faculty}` }, 400);
		}

		const expectedPrefix = selectedMajor.nimPrefix;
		if (!nim.startsWith(expectedPrefix)) {
			return c.json({
				error: `Invalid NIM for ${major}. Must start with ${expectedPrefix}`
			}, 400);
		}

		// 6. NIM Year Validation
		const entryYearStr = entry_year.toString();
		const expectedYearCode = entryYearStr.substring(entryYearStr.length - 2); // Last 2 digits
		const nimYearCode = nim.substring(3, 5); // 4th and 5th digits

		if (expectedYearCode !== nimYearCode) {
			return c.json({
				error: `NIM year code (${nimYearCode}) does not match entry year (${entry_year})`
			}, 400);
		}

		// 7. Create User
		const encryptPassword = (pass: string) => pass; // TODO: Hash password in production

		const result = db.createUser({
			name,
			nim,
			email,
			password: encryptPassword(password),
			faculty,
			major,
			campus,
			entry_year: parseInt(entry_year)
		});

		if (!result.success) {
			return c.json({ error: result.error }, 409); // Conflict
		}

		return c.json({ success: true, message: "Registration successful" });

	} catch (error) {
		console.error("Registration error:", error);
		return c.json({ error: "Registration failed" }, 500);
	}
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

		const electionId = process.env.CURRENT_ELECTION_ID || "election-2024";

		// Deterministic Token Identifier: HMAC(NIM + ElectionID, Secret)
		// This ensures the same user always has the same voting token for an election,
		// preventing double voting even across sessions, and allowing admin to track participation.
		const { createHmac } = await import("node:crypto");
		const tokenIdentifier = createHmac("sha256", process.env.JWT_SECRET || "default-secret")
			.update(`${userInfo.nim}:${electionId}`)
			.digest("hex");

		const token = await new SignJWT({
			email: userInfo.email,
			name: userInfo.name,
			tokenIdentifier: tokenIdentifier,
			electionId: electionId,
			major: userInfo.major, // Add major for demographic stats
			role: userInfo.role, // Ensure role is in token payload
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
				faculty: userInfo.faculty,
				role: userInfo.role
			}
		});
	} catch (error) {
		console.error("Login error:", error);
		return c.json({ error: "Login process failed" }, 500);
	}
});

// Internal endpoint to get all users (protected)
// Used by Backend to generate "Who Voted" report for Admin
app.get("/internal/users", (c) => {
	const secret = c.req.header("x-internal-secret");
	// Simple protection for demo - in prod use mTLS or signed JWT
	if (secret !== (process.env.INTERNAL_SECRET || "internal-secret")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const users = db.getAllUsers(); // Need to implement this in database.ts
		return c.json(users);
	} catch (error: any) {
		console.error("Get users error:", error);
		return c.json({ error: "Failed to get users" }, 500);
	}
});

const port = process.env.ORACLE_PORT ? parseInt(process.env.ORACLE_PORT) : 3002;

console.log(`🔮 Oracle service running on http://localhost:${port} (Local Auth + JWT Mode)`);

serve({
	fetch: app.fetch,
	port,
});

export default app;
