import {
	Context,
	Contract,
	Info,
	Returns,
	Transaction,
} from "fabric-contract-api";
import { Candidate } from "../models/candidate";
import { Election, ElectionStatus } from "../models/election";
import { Vote } from "../models/vote";

@Info({
	title: "VotingContract",
	description: "Smart contract for blockchain-based voting system",
})
export class VotingContract extends Contract {
	// ==================== INITIALIZATION ====================

	@Transaction()
	public async initElection(
		ctx: Context,
		electionId: string,
		name: string,
		startTime: string,
		endTime: string,
		candidatesJson: string
	): Promise<void> {
		// Check if election already exists
		const exists = await this.electionExists(ctx, electionId);
		if (exists) {
			throw new Error(`Election ${electionId} already exists`);
		}

		// Parse candidates
		const candidates: Candidate[] = JSON.parse(candidatesJson);

		// Create election object
		const election: Election = {
			id: electionId,
			name,
			startTime: new Date(startTime),
			endTime: new Date(endTime),
			candidates: candidates.map((c) => ({
				...c,
				voteCount: 0,
			})),
			totalVotes: 0,
			status: ElectionStatus.PENDING,
			createdAt: new Date(),
		};

		// Store election
		await ctx.stub.putState(
			`ELECTION_${electionId}`,
			Buffer.from(JSON.stringify(election))
		);
	}

	@Transaction()
	public async addCandidate(
		ctx: Context,
		electionId: string,
		candidateId: string,
		name: string,
		vision: string,
		imageUrl: string
	): Promise<void> {
		const election = await this.getElection(ctx, electionId);

		// Check if election has started
		if (new Date() >= election.startTime) {
			throw new Error("Cannot add candidates after election has started");
		}

		// Check if candidate already exists
		if (election.candidates.find((c) => c.id === candidateId)) {
			throw new Error(`Candidate ${candidateId} already exists`);
		}

		// Add candidate
		election.candidates.push({
			id: candidateId,
			name,
			vision,
			imageUrl,
			voteCount: 0,
		});

		await ctx.stub.putState(
			`ELECTION_${electionId}`,
			Buffer.from(JSON.stringify(election))
		);
	}

	// ==================== VOTING ====================

	@Transaction()
	public async castVote(
		ctx: Context,
		electionId: string,
		tokenIdentifier: string,
		encryptedVote: string
	): Promise<void> {
		// Get election
		const election = await this.getElection(ctx, electionId);

		// Check if voting is open
		const now = new Date();
		if (now < election.startTime) {
			throw new Error("Election has not started yet");
		}
		if (now > election.endTime) {
			throw new Error("Election has ended");
		}

		// Check for double voting
		const hasVoted = await this.hasVoted(ctx, electionId, tokenIdentifier);
		if (hasVoted) {
			throw new Error("This token has already been used to vote");
		}

		// Create vote record
		const vote: Vote = {
			tokenIdentifier,
			electionId,
			encryptedVote,
			timestamp: new Date(),
		};

		// Store vote
		await ctx.stub.putState(
			`VOTE_${electionId}_${tokenIdentifier}`,
			Buffer.from(JSON.stringify(vote))
		);

		// Update election total votes
		election.totalVotes += 1;
		await ctx.stub.putState(
			`ELECTION_${electionId}`,
			Buffer.from(JSON.stringify(election))
		);

		// Note: Vote count per candidate is updated after election ends
		// when votes are decrypted by the election committee
	}

	@Transaction(false)
	@Returns("boolean")
	public async hasVoted(
		ctx: Context,
		electionId: string,
		tokenIdentifier: string
	): Promise<boolean> {
		const voteBytes = await ctx.stub.getState(
			`VOTE_${electionId}_${tokenIdentifier}`
		);
		return voteBytes && voteBytes.length > 0;
	}

	// ==================== QUERIES ====================

	@Transaction(false)
	@Returns("string")
	public async getElectionStatus(
		ctx: Context,
		electionId: string
	): Promise<string> {
		const election = await this.getElection(ctx, electionId);
		const now = new Date();

		let status: ElectionStatus;
		if (now < election.startTime) {
			status = ElectionStatus.PENDING;
		} else if (now >= election.startTime && now <= election.endTime) {
			status = ElectionStatus.ACTIVE;
		} else {
			status = ElectionStatus.ENDED;
		}

		return JSON.stringify({
			electionId,
			status,
			startTime: election.startTime,
			endTime: election.endTime,
			totalVotes: election.totalVotes,
		});
	}

	@Transaction(false)
	@Returns("string")
	public async getCandidates(
		ctx: Context,
		electionId: string
	): Promise<string> {
		const election = await this.getElection(ctx, electionId);

		// Return candidates without vote counts if election is ongoing
		const now = new Date();
		if (now <= election.endTime) {
			return JSON.stringify(
				election.candidates.map((c) => ({
					id: c.id,
					name: c.name,
					vision: c.vision,
					imageUrl: c.imageUrl,
				}))
			);
		}

		// Return full candidate info including vote counts after election ends
		return JSON.stringify(election.candidates);
	}

	@Transaction(false)
	@Returns("string")
	public async getResults(ctx: Context, electionId: string): Promise<string> {
		const election = await this.getElection(ctx, electionId);
		const now = new Date();

		// Only allow results after election ends
		if (now <= election.endTime) {
			throw new Error(
				"Results are not available until the election ends"
			);
		}

		return JSON.stringify({
			electionId,
			name: election.name,
			totalVotes: election.totalVotes,
			candidates: election.candidates.sort(
				(a, b) => b.voteCount - a.voteCount
			),
			endedAt: election.endTime,
		});
	}

	@Transaction(false)
	@Returns("string")
	public async getVote(
		ctx: Context,
		electionId: string,
		tokenIdentifier: string
	): Promise<string> {
		const voteBytes = await ctx.stub.getState(
			`VOTE_${electionId}_${tokenIdentifier}`
		);

		if (!voteBytes || voteBytes.length === 0) {
			throw new Error("Vote not found");
		}

		return voteBytes.toString();
	}

	// ==================== HELPERS ====================

	@Transaction(false)
	@Returns("boolean")
	public async electionExists(
		ctx: Context,
		electionId: string
	): Promise<boolean> {
		const electionBytes = await ctx.stub.getState(`ELECTION_${electionId}`);
		return electionBytes && electionBytes.length > 0;
	}

	private async getElection(
		ctx: Context,
		electionId: string
	): Promise<Election> {
		const electionBytes = await ctx.stub.getState(`ELECTION_${electionId}`);

		if (!electionBytes || electionBytes.length === 0) {
			throw new Error(`Election ${electionId} does not exist`);
		}

		return JSON.parse(electionBytes.toString());
	}

	// ==================== ADMIN (Post-Election) ====================

	@Transaction()
	public async updateCandidateVoteCount(
		ctx: Context,
		electionId: string,
		candidateId: string,
		voteCount: number
	): Promise<void> {
		const election = await this.getElection(ctx, electionId);

		// Only allow after election ends
		if (new Date() <= election.endTime) {
			throw new Error("Cannot update vote counts until election ends");
		}

		const candidate = election.candidates.find((c) => c.id === candidateId);
		if (!candidate) {
			throw new Error(`Candidate ${candidateId} not found`);
		}

		candidate.voteCount = voteCount;

		await ctx.stub.putState(
			`ELECTION_${electionId}`,
			Buffer.from(JSON.stringify(election))
		);
	}
}
