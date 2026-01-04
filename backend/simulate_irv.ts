
import { fabricService } from "./src/services/fabric";

const ELECTION_ID = "election-2024";

async function runSimulation() {
    console.log("🚀 Starting IRV Simulation...");

    // 1. Reset State
    console.log("🧹 Resetting system state...");
    fabricService.resetState();

    // 2. Define Scenarios
    // Total 100 votes
    // C1: 40 votes (Rank: [1])
    // C2: 31 votes (Rank: [2])
    // C3: 29 votes -> 20 votes (Rank: [3, 2]), 9 votes (Rank: [3, 1])

    const scenarios = [
        { count: 40, ranks: ["candidate-1"], major: "Teknik Informatika" },
        { count: 31, ranks: ["candidate-2"], major: "Sistem dan Teknologi Informasi" },
        { count: 20, ranks: ["candidate-3", "candidate-2"], major: "Teknik Elektro" },
        { count: 9, ranks: ["candidate-3", "candidate-1"], major: "Teknik Elektro" }
    ];

    let totalVoted = 0;

    for (const group of scenarios) {
        console.log(`🗳️ Casting ${group.count} votes for ranking: [${group.ranks.join(", ")}]`);

        for (let i = 0; i < group.count; i++) {
            const tokenIdentifier = `sim-user-${totalVoted}-${Date.now()}`;

            // Create encrypted vote payload
            const voteData = {
                candidateIds: group.ranks,
                major: group.major,
                timestamp: new Date().toISOString()
            };

            // Simple mock encryption (base64) matching frontend behavior
            const encryptedVote = btoa(JSON.stringify(voteData));

            try {
                // Determine primary candidate for aggregate counts (legacy support)
                const primaryId = group.ranks[0];

                // Directly cast vote via service to bypass signature check
                // We manually replicate the "castVote" logic store because castVote is private? 
                // No, castVote is public in fabric.ts? Let's check.
                // It is public.

                await fabricService.castVote(ELECTION_ID, tokenIdentifier, encryptedVote);
                totalVoted++;
            } catch (error) {
                console.error(`❌ Failed to cast vote ${totalVoted}:`, error);
            }
        }
    }

    console.log(`✅ Simulation Complete. Total Votes: ${totalVoted}`);
    console.log(`📊 Result Prediction:`);
    console.log(`   Round 1: C1(40), C2(31), C3(29 -> Eliminated)`);
    console.log(`   Round 2: C1(40+9=49), C2(31+20=51 -> WINNER)`);
}

// Global btoa for node (if not available)
if (typeof btoa === 'undefined') {
    (global as any).btoa = function (str: string) {
        return Buffer.from(str, 'binary').toString('base64');
    };
}

runSimulation().catch(console.error);
