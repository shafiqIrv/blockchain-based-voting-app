import {
    Context,
    Contract,
    Info,
    Returns,
    Transaction,
} from "fabric-contract-api";
import { Candidate } from "../models/candidate";
import { Election, ElectionStatus } from "../models/election";
import { Vote } from "../models/vote";

@Info({
    title: "VotingContract",
    description: "Smart contract for blockchain-based voting system",
})
export class VotingContract extends Contract {

    /**
     * Helper untuk mendapatkan waktu yang deterministik dari timestamp transaksi.
     * Penggunaan 'new Date()' secara langsung dilarang dalam Smart Contract
     * karena setiap node peer bisa memiliki waktu lokal yang berbeda.
     */
    private getCurrentTime(ctx: Context): Date {
        const timestamp = ctx.stub.getTxTimestamp();
        // seconds is a Long object, nanos is a number
        const milliseconds = (timestamp.seconds.low * 1000) + (timestamp.nanos / 1000000);
        return new Date(milliseconds);
    }

    // ==================== INITIALIZATION ====================

    @Transaction()
    public async initElection(
        ctx: Context,
        electionId: string,
        name: string,
        startTime: string,
        endTime: string,
        candidatesJson: string
    ): Promise<void> {
        // Cek apakah pemilihan sudah ada
        const exists = await this.electionExists(ctx, electionId);
        if (exists) {
            throw new Error(`Election ${electionId} already exists`);
        }

        // Parse kandidat dari JSON
        const candidates: Candidate[] = JSON.parse(candidatesJson);

        // Buat objek pemilihan
        const election: Election = {
            id: electionId,
            name,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            candidates: candidates.map((c) => ({
                ...c,
                voteCount: 0,
            })),
            totalVotes: 0,
            status: ElectionStatus.PENDING,
            createdAt: this.getCurrentTime(ctx), // Menggunakan waktu deterministik
        };

        // Simpan pemilihan ke state
        await ctx.stub.putState(
            `ELECTION_${electionId}`,
            Buffer.from(JSON.stringify(election))
        );
    }

    @Transaction()
    public async addCandidate(
        ctx: Context,
        electionId: string,
        candidateId: string,
        name: string,
        vision: string,
        imageUrl: string
    ): Promise<void> {
        const election = await this.getElection(ctx, electionId);
        const now = this.getCurrentTime(ctx);

        // Cek apakah pemilihan sudah dimulai
        if (now >= election.startTime) {
            throw new Error("Cannot add candidates after election has started");
        }

        // Cek apakah kandidat sudah ada
        if (election.candidates.find((c) => c.id === candidateId)) {
            throw new Error(`Candidate ${candidateId} already exists`);
        }

        // Tambah kandidat
        election.candidates.push({
            id: candidateId,
            name,
            vision,
            imageUrl,
            voteCount: 0,
        });

        await ctx.stub.putState(
            `ELECTION_${electionId}`,
            Buffer.from(JSON.stringify(election))
        );
    }

    // ==================== VOTING ====================

    @Transaction()
    public async castVote(
        ctx: Context,
        electionId: string,
        tokenIdentifier: string,
        encryptedVote: string
    ): Promise<void> {
        const election = await this.getElection(ctx, electionId);
        const now = this.getCurrentTime(ctx);

        // Validasi waktu pemilihan
        if (now < election.startTime) {
            throw new Error("Election has not started yet");
        }
        if (now > election.endTime) {
            throw new Error("Election has ended");
        }

        // Cek double voting
        const hasVoted = await this.hasVoted(ctx, electionId, tokenIdentifier);
        if (hasVoted) {
            throw new Error("This token has already been used to vote");
        }

        // Simpan record suara
        const vote: Vote = {
            tokenIdentifier,
            electionId,
            encryptedVote,
            timestamp: now,
        };

        await ctx.stub.putState(
            `VOTE_${electionId}_${tokenIdentifier}`,
            Buffer.from(JSON.stringify(vote))
        );

        // Update total suara pemilihan
        election.totalVotes += 1;
        await ctx.stub.putState(
            `ELECTION_${electionId}`,
            Buffer.from(JSON.stringify(election))
        );
    }

    @Transaction(false)
    @Returns("boolean")
    public async hasVoted(
        ctx: Context,
        electionId: string,
        tokenIdentifier: string
    ): Promise<boolean> {
        const voteBytes = await ctx.stub.getState(
            `VOTE_${electionId}_${tokenIdentifier}`
        );
        return voteBytes && voteBytes.length > 0;
    }

    // ==================== QUERIES ====================

    @Transaction(false)
    @Returns("string")
    public async getElectionStatus(
        ctx: Context,
        electionId: string
    ): Promise<string> {
        const election = await this.getElection(ctx, electionId);
        const now = this.getCurrentTime(ctx);

        let status: ElectionStatus;
        if (now < election.startTime) {
            status = ElectionStatus.PENDING;
        } else if (now >= election.startTime && now <= election.endTime) {
            status = ElectionStatus.ACTIVE;
        } else {
            status = ElectionStatus.ENDED;
        }

        return JSON.stringify({
            electionId,
            status,
            startTime: election.startTime,
            endTime: election.endTime,
            totalVotes: election.totalVotes,
        });
    }

    @Transaction(false)
    @Returns("string")
    public async getCandidates(
        ctx: Context,
        electionId: string
    ): Promise<string> {
        const election = await this.getElection(ctx, electionId);
        const now = this.getCurrentTime(ctx);

        // Sembunyikan jumlah suara jika pemilihan belum berakhir
        if (now <= election.endTime) {
            return JSON.stringify(
                election.candidates.map((c) => ({
                    id: c.id,
                    name: c.name,
                    vision: c.vision,
                    imageUrl: c.imageUrl,
                }))
            );
        }

        return JSON.stringify(election.candidates);
    }

    @Transaction(false)
    @Returns("string")
    public async getResults(ctx: Context, electionId: string): Promise<string> {
        const election = await this.getElection(ctx, electionId);
        const now = this.getCurrentTime(ctx);

        if (now <= election.endTime) {
            throw new Error("Results are not available until the election ends");
        }

        return JSON.stringify({
            electionId,
            name: election.name,
            totalVotes: election.totalVotes,
            candidates: election.candidates.sort(
                (a, b) => b.voteCount - a.voteCount
            ),
            endedAt: election.endTime,
        });
    }

    @Transaction(false)
    @Returns("string")
    public async getVote(
        ctx: Context,
        electionId: string,
        tokenIdentifier: string
    ): Promise<string> {
        const voteBytes = await ctx.stub.getState(
            `VOTE_${electionId}_${tokenIdentifier}`
        );

        if (!voteBytes || voteBytes.length === 0) {
            throw new Error("Vote not found");
        }

        return voteBytes.toString();
    }

    @Transaction()
    public async recordAttendance(ctx: Context, voterEmail: string): Promise<void> {
        const exists = await this.checkAttendance(ctx, voterEmail);
        if (exists) {
            throw new Error(`Voter ${voterEmail} already registered/attended`);
        }
        // Simpan tanda kehadiran (voter sudah ambil ballot)
        await ctx.stub.putState(`ATTENDANCE_${voterEmail}`, Buffer.from("true"));
    }

    @Transaction(false)
    @Returns("boolean")
    public async checkAttendance(ctx: Context, voterEmail: string): Promise<boolean> {
        const data = await ctx.stub.getState(`ATTENDANCE_${voterEmail}`);
        return data && data.length > 0;
    }

    // ==================== HELPERS ====================

    @Transaction(false)
    @Returns("boolean")
    public async electionExists(
        ctx: Context,
        electionId: string
    ): Promise<boolean> {
        const electionBytes = await ctx.stub.getState(`ELECTION_${electionId}`);
        return electionBytes && electionBytes.length > 0;
    }

    private async getElection(
        ctx: Context,
        electionId: string
    ): Promise<Election> {
        const electionBytes = await ctx.stub.getState(`ELECTION_${electionId}`);

        if (!electionBytes || electionBytes.length === 0) {
            throw new Error(`Election ${electionId} does not exist`);
        }

        const election = JSON.parse(electionBytes.toString());

        // Fix: Explicitly convert date strings back to Date objects
        // JSON.parse leaves them as strings, causing comparisons to fail (NaN)
        election.startTime = new Date(election.startTime);
        election.endTime = new Date(election.endTime);
        election.createdAt = new Date(election.createdAt);

        return election;
    }

    // ==================== NEW METHODS ====================

    @Transaction()
    public async updateElectionDates(
        ctx: Context,
        electionId: string,
        startTime: string,
        endTime: string
    ): Promise<void> {
        const election = await this.getElection(ctx, electionId);
        election.startTime = new Date(startTime);
        election.endTime = new Date(endTime);

        await ctx.stub.putState(
            `ELECTION_${electionId}`,
            Buffer.from(JSON.stringify(election))
        );
    }

    @Transaction()
    public async deleteCandidate(
        ctx: Context,
        electionId: string,
        candidateId: string
    ): Promise<void> {
        const election = await this.getElection(ctx, electionId);
        const now = this.getCurrentTime(ctx);

        if (now >= election.startTime) {
            throw new Error("Cannot delete candidates after election has started");
        }

        const initialLength = election.candidates.length;
        election.candidates = election.candidates.filter(c => c.id !== candidateId);

        if (election.candidates.length === initialLength) {
            throw new Error(`Candidate ${candidateId} not found`);
        }

        await ctx.stub.putState(
            `ELECTION_${electionId}`,
            Buffer.from(JSON.stringify(election))
        );
    }

    @Transaction(false)
    @Returns("boolean")
    public async checkParticipation(
        ctx: Context,
        voterEmail: string
    ): Promise<boolean> {
        // "Participation" here implies they have requested to vote (e.g. got a token)
        // or actually voted. Backend uses it as "Is registered / has identity" sometimes.
        // Let's assume it checks the "PARTICIPATION" record if we add one.
        // But backend seems to map "hasVoted" -> checkParticipation.
        // And "hasIdentity" -> checkAttendance.

        // Let's implement looking for explicit Participation record if used
        const data = await ctx.stub.getState(`PARTICIPATION_${voterEmail}`);
        return data && data.length > 0;
    }

    @Transaction()
    public async recordParticipation(
        ctx: Context,
        voterEmail: string
    ): Promise<void> {
        await ctx.stub.putState(`PARTICIPATION_${voterEmail}`, Buffer.from("true"));
    }

    @Transaction(false)
    @Returns("string")
    public async getBallots(
        ctx: Context,
        electionId: string
    ): Promise<string> {
        const election = await this.getElection(ctx, electionId);
        const now = this.getCurrentTime(ctx);

        // Allow fetching ballots only after election ends for IRV calculation
        if (now <= election.endTime) {
            throw new Error("Ballots are private until election ends");
        }

        // This is an expensive operation (range query). 
        // In production, use pagination or specific query.
        // Iterator for all votes in this election
        // Key schema: VOTE_{electionId}_{token}
        // Since we don't have composite key with electionId first easily iterable without token,
        // we might fail here if keys are strictly `VOTE_elec_token`.
        // Better schema for range: `VOTE_{electionId}_{token}` works if we use getStateByRange.

        const startKey = `VOTE_${electionId}_`;
        const endKey = `VOTE_${electionId}_\uffff`;

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const results = [];

        let result = await iterator.next();
        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                const vote: Vote = JSON.parse(result.value.value.toString());
                // DECRYPT VOTE NEEDS TO HAPPEN OFF-CHAIN USUALLY.
                // OR RETURN ENCRYPTED.
                // The backend IRV service expects { candidateIds: [] }.
                // If data is encrypted on chain, strict chaincode can't decrypt it.
                // We will return the vote objects.
                results.push(vote);
            }
            result = await iterator.next();
        }
        return JSON.stringify(results);
    }

    // ==================== ADMIN (Post-Election) ====================

    @Transaction()
    public async updateCandidateVoteCount(
        ctx: Context,
        electionId: string,
        candidateId: string,
        voteCount: number
    ): Promise<void> {
        const election = await this.getElection(ctx, electionId);
        const now = this.getCurrentTime(ctx);

        if (now <= election.endTime) {
            throw new Error("Cannot update vote counts until election ends");
        }

        const candidate = election.candidates.find((c) => c.id === candidateId);
        if (!candidate) {
            throw new Error(`Candidate ${candidateId} not found`);
        }

        candidate.voteCount = voteCount;

        await ctx.stub.putState(
            `ELECTION_${electionId}`,
            Buffer.from(JSON.stringify(election))
        );
    }
}