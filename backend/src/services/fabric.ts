import * as fs from 'fs';
import * as path from 'path';

/**
 * Fabric Gateway Service
 * Connects to Hyperledger Fabric network and executes chaincode
 *
 * Note: This is a simplified mock implementation for development.
 * In production, use the actual fabric-gateway SDK.
 */

export interface FabricConfig {
	channelName: string;
	chaincodeName: string;
	mspId: string;
	peerEndpoint: string;
}

// Mock data store for development (simulates blockchain state)
const mockState: {
	elections: Map<string, any>;
	votes: Map<string, any>;
	attendance: Map<string, boolean>; // Tracks if a user (NIM/Email) has received a ballot
	participation: Map<string, boolean>; // Tracks if a user has completed the voting process (confirmed)
} = {
	elections: new Map(),
	votes: new Map(),
	attendance: new Map(),
	participation: new Map(),
};

// Initialize with seed data
function initializeSeedData() {
	const electionId = "election-2024";

	if (!mockState.elections.has(electionId)) {
		mockState.elections.set(electionId, {
			id: electionId,
			name: "Pemilihan Ketua Kabinet Keluarga Mahasiswa ITB 2026/2027",
			startTime: new Date("2024-12-01T00:00:00Z"),
			endTime: new Date("2026-01-31T23:59:59Z"),
			candidates: [
				{
					id: "candidate-1",
					name: "Ahmad Fauzan",
					vision: "Membangun himpunan yang inklusif dan inovatif dengan fokus pada pengembangan soft skills mahasiswa serta kolaborasi antar jurusan.",
					imageUrl: "/candidates/candidate1.jpg",
					voteCount: 0,
				},
				{
					id: "candidate-2",
					name: "Siti Nurhaliza",
					vision: "Transformasi digital himpunan untuk meningkatkan keterlibatan mahasiswa dan transparansi organisasi melalui platform teknologi modern.",
					imageUrl: "/candidates/candidate2.jpg",
					voteCount: 0,
				},
				{
					id: "candidate-3",
					name: "Budi Santoso",
					vision: "Memperkuat jaringan alumni dan industri untuk membuka lebih banyak peluang magang dan karir bagi mahasiswa.",
					imageUrl: "/candidates/candidate3.jpg",
					voteCount: 0,
				},
			],
			totalVotes: 0,
			status: "ACTIVE",
			createdAt: new Date(),
		});

		console.log("✅ Seed data initialized for election:", electionId);
	}
}

// Initialize seed data on module load
// initializeSeedData() - Called in constructor if needed

export class FabricService {
	private config: FabricConfig;
	private connected: boolean = false;
	private readonly DATA_DIR = path.join(process.cwd(), 'data');
	private readonly ATTENDANCE_FILE = path.join(process.cwd(), 'data', 'attendance.json');
	private readonly PARTICIPATION_FILE = path.join(process.cwd(), 'data', 'participation.json');
	private readonly ELECTIONS_FILE = path.join(process.cwd(), 'data', 'elections.json');

	constructor() {
		this.config = {
			channelName: process.env.FABRIC_CHANNEL_NAME || "votingchannel",
			chaincodeName: process.env.FABRIC_CHAINCODE_NAME || "voting",
			mspId: process.env.FABRIC_MSP_ID || "ITBMSP",
			peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || "localhost:7051",
		};
		this.loadAttendance();
		this.loadParticipation();
		this.loadElections();
	}

	private loadElections() {
		try {
			if (fs.existsSync(this.ELECTIONS_FILE)) {
				const data = fs.readFileSync(this.ELECTIONS_FILE, 'utf-8');
				const parsed = JSON.parse(data);
				mockState.elections = new Map(Object.entries(parsed));
				console.log(`✅ Election data loaded (${mockState.elections.size} records)`);
			} else {
				// Initial seed if file doesn't exist
				initializeSeedData();
				this.saveElections();
			}
		} catch (e) {
			console.error("Failed to load election data", e);
		}
	}

	private saveElections() {
		try {
			if (!fs.existsSync(this.DATA_DIR)) {
				fs.mkdirSync(this.DATA_DIR, { recursive: true });
			}
			const obj = Object.fromEntries(mockState.elections);
			fs.writeFileSync(this.ELECTIONS_FILE, JSON.stringify(obj, null, 2));
		} catch (e) {
			console.error("Failed to save election data", e);
		}
	}

	private loadAttendance() {
		try {
			if (fs.existsSync(this.ATTENDANCE_FILE)) {
				const data = fs.readFileSync(this.ATTENDANCE_FILE, 'utf-8');
				const parsed = JSON.parse(data);
				// Convert array/object back to Map
				mockState.attendance = new Map(Object.entries(parsed));
				console.log(`✅ Attendance data loaded (${mockState.attendance.size} records)`);
			}
		} catch (e) {
			console.error("Failed to load attendance data", e);
		}
	}

	private saveAttendance() {
		try {
			if (!fs.existsSync(this.DATA_DIR)) {
				fs.mkdirSync(this.DATA_DIR, { recursive: true });
			}
			// Convert Map to Object for JSON
			const obj = Object.fromEntries(mockState.attendance);
			fs.writeFileSync(this.ATTENDANCE_FILE, JSON.stringify(obj, null, 2));
		} catch (e) {
			console.error("Failed to save attendance data", e);
		}
	}

	private loadParticipation() {
		try {
			if (fs.existsSync(this.PARTICIPATION_FILE)) {
				const data = fs.readFileSync(this.PARTICIPATION_FILE, 'utf-8');
				const parsed = JSON.parse(data);
				mockState.participation = new Map(Object.entries(parsed));
				console.log(`✅ Participation data loaded (${mockState.participation.size} records)`);
			}
		} catch (e) {
			console.error("Failed to load participation data", e);
		}
	}

	private saveParticipation() {
		try {
			if (!fs.existsSync(this.DATA_DIR)) {
				fs.mkdirSync(this.DATA_DIR, { recursive: true });
			}
			const obj = Object.fromEntries(mockState.participation);
			fs.writeFileSync(this.PARTICIPATION_FILE, JSON.stringify(obj, null, 2));
		} catch (e) {
			console.error("Failed to save participation data", e);
		}
	}

	/**
	 * Connect to Fabric network
	 * In development, this is a no-op
	 */
	async connect(): Promise<void> {
		// In production, establish actual connection
		console.log("🔗 Fabric service initialized (mock mode)");
		this.connected = true;
	}

	/**
	 * Get election by ID
	 */
	async getElection(electionId: string): Promise<any> {
		const election = mockState.elections.get(electionId);
		if (!election) {
			throw new Error(`Election ${electionId} not found`);
		}
		return election;
	}

	/**
	 * Get election status
	 */
	async getElectionStatus(electionId: string): Promise<any> {
		const election = await this.getElection(electionId);
		const now = new Date();
		const startTime = new Date(election.startTime);
		const endTime = new Date(election.endTime);

		console.log(`[StatusCheck] Now: ${now.toISOString()} | Start: ${startTime.toISOString()} | End: ${endTime.toISOString()}`);

		let status: string;
		if (now < startTime) {
			status = "PENDING";
		} else if (now > endTime) {
			status = "ENDED";
		} else {
			status = "ACTIVE";
		}

		console.log(`[StatusCheck] Calculated Status: ${status}`);

		return {
			electionId,
			name: election.name,
			status,
			startTime: election.startTime,
			endTime: election.endTime,
			totalVotes: election.totalVotes,
		};
	}

	/**
	 * Get candidates for an election
	 */
	async getCandidates(electionId: string): Promise<any[]> {
		const election = await this.getElection(electionId);
		const now = new Date();

		// Hide vote counts if election is still active
		if (now <= new Date(election.endTime)) {
			return election.candidates.map((c: any) => ({
				id: c.id,
				name: c.name,
				vision: c.vision,
				imageUrl: c.imageUrl,
			}));
		}

		return election.candidates;
	}

	/**
	 * Update election start and end dates
	 */
	async updateElectionDates(
		electionId: string,
		startTime: Date,
		endTime: Date
	): Promise<any> {
		const election = mockState.elections.get(electionId);
		if (!election) {
			throw new Error(`Election ${electionId} not found`);
		}

		console.log(`[UpdateDates] New Start: ${startTime.toISOString()} | New End: ${endTime.toISOString()}`);

		election.startTime = startTime;
		election.endTime = endTime;

		// Re-evaluate status
		const now = new Date();
		if (now < startTime) {
			election.status = "PENDING";
		} else if (now > endTime) {
			election.status = "ENDED";
		} else {
			election.status = "ACTIVE";
		}

		this.saveElections(); // Fix missing save
		return election;
	}

	async addCandidate(electionId: string, candidate: any): Promise<any> {
		const election = mockState.elections.get(electionId);
		if (!election) throw new Error("Election not found");

		candidate.id = candidate.id || `candidate-${Date.now()}`;
		candidate.voteCount = 0;

		election.candidates.push(candidate);
		this.saveElections();
		return candidate;
	}

	async deleteCandidate(electionId: string, candidateId: string): Promise<void> {
		const election = mockState.elections.get(electionId);
		if (!election) throw new Error("Election not found");

		const initialLength = election.candidates.length;
		election.candidates = election.candidates.filter((c: any) => c.id !== candidateId);

		if (election.candidates.length === initialLength) {
			throw new Error("Candidate not found");
		}

		this.saveElections();
	}

	/**
	 * Check if a token has already voted
	 */
	async hasVoted(
		electionId: string,
		tokenIdentifier: string
	): Promise<boolean> {
		const voteKey = `${electionId}:${tokenIdentifier}`;
		return mockState.votes.has(voteKey);
	}

	/**
	 * Cast a vote
	 */
	async castVote(
		electionId: string,
		tokenIdentifier: string,
		encryptedVote: string
	): Promise<{ success: boolean; message: string }> {
		// Check if already voted
		if (await this.hasVoted(electionId, tokenIdentifier)) {
			throw new Error("Token has already been used to vote");
		}

		const election = await this.getElection(electionId);
		const now = new Date();

		// Check if election is active
		if (now < new Date(election.startTime)) {
			throw new Error("Election has not started yet");
		}
		if (now > new Date(election.endTime)) {
			throw new Error("Election has ended");
		}

		// Store vote
		const voteKey = `${electionId}:${tokenIdentifier}`;
		mockState.votes.set(voteKey, {
			tokenIdentifier,
			electionId,
			encryptedVote,
			timestamp: new Date(),
		});

		// Update election total votes
		election.totalVotes += 1;

		// For demo: decode vote and increment candidate count
		// In production, votes are encrypted and counted after election ends
		// For demo: decode vote and increment candidate count
		// In production, votes are encrypted and counted after election ends
		try {
			const voteData = JSON.parse(atob(encryptedVote));
			// Support both new array format and legacy single ID format (backward compat)
			const primaryCandidateId = voteData.candidateIds ? voteData.candidateIds[0] : voteData.candidateId;

			const candidate = election.candidates.find(
				(c: any) => c.id === primaryCandidateId
			);
			if (candidate) {
				candidate.voteCount += 1;
			}
		} catch (e) {
			// Vote is encrypted, will be counted later
		}

		return { success: true, message: "Vote recorded successfully" };
	}

	/**
	 * Verify a vote exists
	 */
	async getVote(
		electionId: string,
		tokenIdentifier: string
	): Promise<any | null> {
		const voteKey = `${electionId}:${tokenIdentifier}`;
		return mockState.votes.get(voteKey) || null;
	}

	/**
	 * Record that a user has requested a ballot (Attendance)
	 */
	async recordAttendance(userId: string): Promise<void> {
		mockState.attendance.set(userId, true);
		this.saveAttendance();
		console.log(`📝 Attendance recorded for user: ${userId}`);
	}

	/**
	 * Check if a user has received a ballot
	 */
	async checkAttendance(userId: string): Promise<boolean> {
		return mockState.attendance.get(userId) || false;
	}

	/**
	 * Record that a user has successfully voted (Participation)
	 */
	async recordParticipation(userId: string): Promise<void> {
		mockState.participation.set(userId, true);
		this.saveParticipation();
		console.log(`✅ Participation recorded for user: ${userId}`);
	}

	/**
	 * Check if a user has successfully voted
	 */
	async checkParticipation(userId: string): Promise<boolean> {
		return mockState.participation.get(userId) || false;
	}

	/**
	 * Get election results (only if election has ended)
	 */
	async getResults(electionId: string, bypassTimeCheck: boolean = false): Promise<any> {
		const election = await this.getElection(electionId);
		const now = new Date();

		if (!bypassTimeCheck && now <= new Date(election.endTime)) {
			throw new Error(
				"Results are not available until the election ends"
			);
		}

		return {
			electionId,
			name: election.name,
			totalVotes: election.totalVotes,
			candidates: [...election.candidates].sort(
				(a: any, b: any) => b.voteCount - a.voteCount
			),
			endedAt: election.endTime,
		};
	}
}

export const fabricService = new FabricService();
