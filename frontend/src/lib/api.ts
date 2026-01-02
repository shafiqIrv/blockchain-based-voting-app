const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface User {
	email: string;
	name: string;
	tokenIdentifier: string;
	electionId: string;
	role?: "admin" | "voter";
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
	getLoginUrl(): Promise<{ loginUrl: string }> {
		return this.fetch("/api/auth/login-url");
	}

	getMe(): Promise<User> {
		return this.fetch("/api/auth/me");
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

	getResults(electionId: string): Promise<{
		electionId: string;
		name: string;
		totalVotes: number;
		candidates: Candidate[];
		endedAt: string;
	}> {
		return this.fetch(`/api/election/${electionId}/results`);
	}

	// Vote
	submitVote(
		candidateId: string
	): Promise<{ success: boolean; message: string; tokenIdentifier: string }> {
		return this.fetch("/api/vote/submit", {
			method: "POST",
			body: JSON.stringify({ candidateId }),
		});
	}

	getVoteStatus(): Promise<{ hasVoted: boolean; tokenIdentifier: string }> {
		return this.fetch("/api/vote/status");
	}

	verifyVote(
		tokenId: string,
		electionId?: string
	): Promise<VoteVerification> {
		const params = electionId ? `?electionId=${electionId}` : "";
		return this.fetch(`/api/vote/verify/${tokenId}${params}`);
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
}

export const api = new ApiClient();
