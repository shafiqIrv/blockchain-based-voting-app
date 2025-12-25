export interface Vote {
	tokenIdentifier: string;
	electionId: string;
	encryptedVote: string;
	timestamp: Date | string;
}

export interface VoteSubmission {
	electionId: string;
	tokenIdentifier: string;
	encryptedVote: string;
}

export interface VoteVerification {
	found: boolean;
	vote?: Vote;
	message?: string;
}
