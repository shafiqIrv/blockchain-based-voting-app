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
} = {
	elections: new Map(),
	votes: new Map(),
};

// Initialize with seed data
function initializeSeedData() {
	const electionId = "election-2024";

	if (!mockState.elections.has(electionId)) {
		mockState.elections.set(electionId, {
			id: electionId,
			name: "Pemilihan Ketua Himpunan Mahasiswa ITB 2024",
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
initializeSeedData();

export class FabricService {
	private config: FabricConfig;
	private connected: boolean = false;

	constructor() {
		this.config = {
			channelName: process.env.FABRIC_CHANNEL_NAME || "votingchannel",
			chaincodeName: process.env.FABRIC_CHAINCODE_NAME || "voting",
			mspId: process.env.FABRIC_MSP_ID || "ITBMSP",
			peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || "localhost:7051",
		};
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

		let status: string;
		if (now < new Date(election.startTime)) {
			status = "PENDING";
		} else if (now > new Date(election.endTime)) {
			status = "ENDED";
		} else {
			status = "ACTIVE";
		}

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

		return election;
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
		try {
			const voteData = JSON.parse(atob(encryptedVote));
			const candidate = election.candidates.find(
				(c: any) => c.id === voteData.candidateId
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
