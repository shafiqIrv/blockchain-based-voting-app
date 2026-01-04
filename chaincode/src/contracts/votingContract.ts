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

        return JSON.parse(electionBytes.toString());
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