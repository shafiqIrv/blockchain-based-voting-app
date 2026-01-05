const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface User {
	email: string;
	name: string;
	tokenIdentifier: string;
	electionId: string;
	major?: string; // Add major
	role?: "admin" | "voter";
}

export interface IRVRound {
	roundNumber: number;
	candidates: { id: string; voteCount: number }[];
	eliminatedId?: string;
}

export interface IRVResult {
	winnerId: string | null;
	rounds: IRVRound[];
}

export interface Candidate {
	id: string;
	name: string;
	vision: string;
	imageUrl?: string;
	voteCount?: number;
}

export interface Election {
	id: string;
	name: string;
	startTime: string;
	endTime: string;
	candidates: Candidate[];
	totalVotes: number;
	status: "PENDING" | "ACTIVE" | "ENDED";
}

export interface ElectionStatus {
	electionId: string;
	name: string;
	status: "PENDING" | "ACTIVE" | "ENDED";
	startTime: string;
	endTime: string;
	totalVotes: number;
}

export interface VoteVerification {
	found: boolean;
	vote?: {
		tokenIdentifier: string;
		electionId: string;
		timestamp: string;
	};
	message?: string;
}

class ApiClient {
	private token: string | null = null;

	setToken(token: string) {
		this.token = token;
		if (typeof window !== "undefined") {
			localStorage.setItem("voting_token", token);
		}
	}

	getToken(): string | null {
		if (this.token) return this.token;
		if (typeof window !== "undefined") {
			this.token = localStorage.getItem("voting_token");
		}
		return this.token;
	}

	clearToken() {
		this.token = null;
		if (typeof window !== "undefined") {
			localStorage.removeItem("voting_token");
			localStorage.removeItem("voting_tokenId");
		}
	}

	private async fetch<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const token = this.getToken();
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			...options.headers,
		};

		if (token) {
			(headers as Record<string, string>)[
				"Authorization"
			] = `Bearer ${token}`;
		}

		const response = await fetch(`${API_URL}${endpoint}`, {
			...options,
			headers,
		});

		if (!response.ok) {
			const error = await response
				.json()
				.catch(() => ({ error: "Request failed" }));
			throw new Error(error.error || "Request failed");
		}

		return response.json();
	}

	// Auth
	async login(credentials: any): Promise<any> {
		return this.fetch("/api/auth/login", {
			method: "POST",
			body: JSON.stringify(credentials),
		});
	}

	async register(data: any): Promise<any> {
		return this.fetch("/api/auth/register", {
			method: "POST",
			body: JSON.stringify(data),
		});
	}

	async getFaculties(): Promise<any[]> {
		return this.fetch("/api/auth/faculties");
	}

	getMe(): Promise<User> {
		return this.fetch("/api/auth/me");
	}

	getVotingKeys(): Promise<{ publicKey: { n: string; e: string } }> {
		return this.fetch("/api/auth/voting-keys");
	}

	registerVoting(blindedToken: string): Promise<{ success: boolean; blindSignature: string }> {
		return this.fetch("/api/auth/register-voting", {
			method: "POST",
			body: JSON.stringify({ blindedToken })
		});
	}

	// Election
	getCurrentElection(): Promise<Election> {
		return this.fetch("/api/election");
	}

	getElection(id: string): Promise<Election> {
		return this.fetch(`/api/election/${id}`);
	}

	getElectionStatus(id: string): Promise<ElectionStatus> {
		return this.fetch(`/api/election/${id}/status`);
	}

	getCandidates(electionId: string): Promise<{ candidates: Candidate[] }> {
		return this.fetch(`/api/election/${electionId}/candidates`);
	}

	addCandidate(electionId: string, candidate: Partial<Candidate>): Promise<Candidate> {
		return this.fetch(`/api/election/${electionId}/candidates`, {
			method: "POST",
			body: JSON.stringify(candidate),
		});
	}

	deleteCandidate(electionId: string, candidateId: string): Promise<{ success: boolean }> {
		return this.fetch(`/api/election/${electionId}/candidates/${candidateId}`, {
			method: "DELETE",
		});
	}


	getResults(electionId: string): Promise<{
		electionId: string;
		name: string;
		totalVotes: number;
		candidates: Candidate[];
		votesByMajor?: Record<string, Record<string, number>>;
		endedAt: string;
	}> {
		return this.fetch(`/api/election/${electionId}/results`);
	}

	getElectionStats(electionId: string): Promise<Record<string, { total: number; voted: number }>> {
		return this.fetch(`/api/election/${electionId}/stats`);
	}

	getElectionIRV(electionId: string): Promise<IRVResult> {
		return this.fetch(`/api/election/${electionId}/irv`);
	}



	// Vote
	// Vote
	submitVote(
		candidateIds: string[],
		tokenIdentifier?: string,
		signature?: string,
		major?: string
	): Promise<{ success: boolean; message: string; tokenIdentifier: string }> {
		return this.fetch("/api/vote/submit", {
			method: "POST",
			body: JSON.stringify({
				candidateIds,
				tokenIdentifier,
				signature,
				major
			}),
		});
	}

	confirmParticipation(): Promise<{ success: boolean }> {
		return this.fetch("/api/vote/confirm", {
			method: "POST",
		});
	}

	getVoteStatus(): Promise<{ hasVoted: boolean; timestamp?: string }> {
		return this.fetch("/api/vote/status");
	}

	verifyVote(tokenId: string): Promise<{
		found: boolean;
		vote?: {
			candidateId: string;
			timestamp: string;
		}
	}> {
		return this.fetch(`/api/vote/verify/${tokenId}`);
	}

	updateElectionDates(
		electionId: string,
		startDate: string,
		endDate: string
	): Promise<Election> {
		return this.fetch(`/api/election/${electionId}/dates`, {
			method: "POST",
			body: JSON.stringify({ startDate, endDate }),
		});
	}

	createElection(data: any): Promise<{ success: boolean; message: string }> {
		return this.fetch("/api/election", {
			method: "POST",
			body: JSON.stringify(data),
		});
	}

	getVoters(electionId: string): Promise<Voter[]> {
		return this.fetch(`/api/election/${electionId}/voters`);
	}
}

export interface Voter {
	nim: string;
	name: string;
	faculty: string;
	major: string; // Added major
	role: string;
	hasVoted: boolean;
	hasIdentity?: boolean; // New field for detailed status
}

export const api = new ApiClient();
