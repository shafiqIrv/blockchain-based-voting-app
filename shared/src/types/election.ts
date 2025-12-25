import { Candidate } from "./candidate";

export enum ElectionStatus {
	PENDING = "PENDING",
	ACTIVE = "ACTIVE",
	ENDED = "ENDED",
}

export interface Election {
	id: string;
	name: string;
	startTime: Date | string;
	endTime: Date | string;
	candidates: Candidate[];
	totalVotes: number;
	status: ElectionStatus;
	createdAt: Date | string;
}

export interface ElectionStatusResponse {
	electionId: string;
	status: ElectionStatus;
	startTime: Date | string;
	endTime: Date | string;
	totalVotes: number;
}

export interface ElectionResults {
	electionId: string;
	name: string;
	totalVotes: number;
	candidates: Candidate[];
	endedAt: Date | string;
}
