export interface Candidate {
	id: string;
	name: string;
	vision: string;
	imageUrl?: string;
	voteCount?: number;
}

export interface CandidateInput {
	id: string;
	name: string;
	vision: string;
	imageUrl?: string;
}
