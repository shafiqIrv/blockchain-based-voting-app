export interface TokenPair {
	tokenIdentifier: string;
	verificationToken: string;
}

export interface TokenGenerationRequest {
	studentId: string;
	electionId: string;
}

export interface TokenValidationResult {
	valid: boolean;
	tokenIdentifier?: string;
	error?: string;
}
