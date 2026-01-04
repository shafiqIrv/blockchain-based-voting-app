export interface CandidateRound {
    id: string;
    voteCount: number;
}

export interface IRVRound {
    roundNumber: number;
    candidates: CandidateRound[];
    eliminatedId?: string; // Who was eliminated this round
    transferredVotes?: { from: string, to: string, count: number }[]; // Debug info
}

export interface IRVResult {
    winnerId: string | null;
    rounds: IRVRound[];
}

export function calculateIRV(ballots: string[][], candidateIds: string[]): IRVResult {
    const rounds: IRVRound[] = [];
    let activeCandidates = new Set<string>(candidateIds);
    let roundNumber = 1;
    let currentBallots = ballots.map(b => [...b]); // Clone

    while (activeCandidates.size > 1) {
        // 1. Count First Preferences
        const voteCounts: Record<string, number> = {};
        activeCandidates.forEach(id => voteCounts[id] = 0);
        let totalValidVotes = 0;

        for (const ballot of currentBallots) {
            // Find first active candidate in the ballot
            const firstChoice = ballot.find(id => activeCandidates.has(id));
            if (firstChoice) {
                voteCounts[firstChoice] = (voteCounts[firstChoice] || 0) + 1;
                totalValidVotes++;
            }
        }

        // 2. Record Round State
        const sortedCandidates = Object.entries(voteCounts)
            .map(([id, count]) => ({ id, voteCount: count }))
            .sort((a, b) => b.voteCount - a.voteCount);

        // Check for majority winner (>50%)
        if (sortedCandidates[0].voteCount > totalValidVotes / 2) {
            rounds.push({
                roundNumber: roundNumber,
                candidates: sortedCandidates
            });
            return {
                winnerId: sortedCandidates[0].id,
                rounds
            };
        }

        // 3. Find Candidate to Eliminate (Lowest Votes)
        // If tie, simple resolution: pick the last one (improve later if needed)
        const toEliminate = sortedCandidates[sortedCandidates.length - 1];

        rounds.push({
            roundNumber: roundNumber,
            candidates: sortedCandidates,
            eliminatedId: toEliminate.id
        });

        activeCandidates.delete(toEliminate.id);
        roundNumber++;
    }

    // Default return if 1 left
    return {
        winnerId: Array.from(activeCandidates)[0],
        rounds
    };
}
