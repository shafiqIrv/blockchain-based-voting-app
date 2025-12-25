import { Candidate } from "./candidate";

export enum ElectionStatus {
	PENDING = "PENDING",
	ACTIVE = "ACTIVE",
	ENDED = "ENDED",
}

export interface Election {
	id: string;
	name: string;
	startTime: Date;
	endTime: Date;
	candidates: Candidate[];
	totalVotes: number;
	status: ElectionStatus;
	createdAt: Date;
}
