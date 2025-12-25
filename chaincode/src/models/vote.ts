export interface Vote {
	tokenIdentifier: string;
	electionId: string;
	encryptedVote: string;
	timestamp: Date;
}
