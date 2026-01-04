import * as fs from 'fs';
import * as path from 'path';
import { Gateway, Wallets, Contract, Network } from 'fabric-network';
import { v4 as uuidv4 } from 'uuid';

export class FabricService {
    private gateway: Gateway | null = null;
    private network: Network | null = null;
    private contract: Contract | null = null;

    constructor() {
        // Konfigurasi diambil dari .env
    }

    async connect(): Promise<void> {
        const ccpPath = path.resolve(process.env.FABRIC_CONNECTION_PROFILE || '../network/connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const walletPath = path.resolve(process.env.FABRIC_WALLET_PATH || './wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Pastikan identitas admin sudah ada di wallet
        const identity = await wallet.get('admin');
        if (!identity) {
            throw new Error('Admin identity not found in wallet. Run enrollAdmin.ts first.');
        }

        this.gateway = new Gateway();
        await this.gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { enabled: true, asLocalhost: true }
        });

        this.network = await this.gateway.getNetwork(process.env.FABRIC_CHANNEL_NAME || 'votingchannel');
        this.contract = this.network.getContract(process.env.FABRIC_CHAINCODE_NAME || 'voting');
        console.log("✅ Connected to Hyperledger Fabric Network");
    }

    // Pemanggilan fungsi chaincode
    async getElection(electionId: string): Promise<any> {
        try {
            console.log(`[Fabric] getElection calling getElectionStatus for ${electionId}`);
            const statusResult = await this.contract?.evaluateTransaction('getElectionStatus', electionId);
            const statusStr = statusResult?.toString();
            console.log(`[Fabric] Raw Status String:`, statusStr);

            const status = JSON.parse(statusStr || '{}');
            console.log(`[Fabric] Parsed Status Object:`, status);

            // FIX: Calculate status manually in backend to override potential chaincode date issues
            const now = new Date();
            const start = new Date(status.startTime);
            const end = new Date(status.endTime);
            let calculatedStatus = "ENDED";

            if (now < start) {
                calculatedStatus = "PENDING";
            } else if (now >= start && now <= end) {
                calculatedStatus = "ACTIVE";
            }

            console.log(`[Fabric] Calculated Status (Backend Override): ${calculatedStatus} (Chaincode said: ${status.status})`);

            const candidatesResult = await this.contract?.evaluateTransaction('getCandidates', electionId);
            const candidates = JSON.parse(candidatesResult?.toString() || '[]');

            // Construct full Election object for Frontend
            return {
                ...status,
                status: calculatedStatus, // Override with backend calculation
                id: status.electionId || electionId, // Map electionId to id
                name: "Pemilihan Raya KM ITB 2024", // Temporary Fallback as name isn't in getElectionStatus
                candidates: candidates
            };
        } catch (error) {
            console.error("Fabric getElection failed:", error);
            throw error;
        }
    }

    async getElectionStatus(electionId: string): Promise<any> {
        // Reusing getElection as it returns the full object including status
        return this.getElection(electionId);
    }

    async castVote(electionId: string, tokenIdentifier: string, encryptedVote: string): Promise<void> {
        // Mengirim transaksi ke ITBMSP dan KPUMSP untuk memenuhi kebijakan endorsement
        await this.contract?.submitTransaction('castVote', electionId, tokenIdentifier, encryptedVote);
    }

    async checkAttendance(voterEmail: string): Promise<boolean> {
        const result = await this.contract?.evaluateTransaction('checkAttendance', voterEmail);
        return result?.toString() === 'true';
    }

    async recordAttendance(voterEmail: string): Promise<void> {
        await this.contract?.submitTransaction('recordAttendance', voterEmail);
    }

    async getCandidates(electionId: string): Promise<any[]> {
        const result = await this.contract?.evaluateTransaction('getCandidates', electionId);
        return JSON.parse(result?.toString() || '[]');
    }

    // --- New Methods ---

    async getResults(electionId: string, bypassTimeCheck: boolean = false): Promise<any> {
        // Warning: This transaction might fail in chaincode if election is not ended, unless logic handles it.
        // If chaincode strictly enforces time, bypassTimeCheck won't work unless passed to chaincode.
        // Assuming chaincode 'getResults' handles the check.
        const result = await this.contract?.evaluateTransaction('getResults', electionId);
        return JSON.parse(result?.toString() || '{}');
    }

    async updateElectionDates(electionId: string, startDate: Date, endDate: Date): Promise<any> {
        console.log(`[Fabric] Submitting Update:`, {
            id: electionId,
            start: startDate.toISOString(),
            end: endDate.toISOString()
        });
        await this.contract?.submitTransaction('updateElectionDates', electionId, startDate.toISOString(), endDate.toISOString());

        console.log(`[Fabric] Transaction submitted. Fetching new state...`);
        return this.getElection(electionId);
    }

    async initElection(electionId: string, name: string, startTime: Date, endTime: Date, candidates: any[]): Promise<void> {
        const candidatesJson = JSON.stringify(candidates);
        await this.contract?.submitTransaction('initElection', electionId, name, startTime.toISOString(), endTime.toISOString(), candidatesJson);
    }

    async addCandidate(electionId: string, candidateData: any): Promise<any> {
        // Chaincode expects: electionId, candidateId, name, vision, imageUrl
        const candidateId = uuidv4(); // Generate ID here since frontend doesn't send it
        const { name, vision, imageUrl } = candidateData;

        await this.contract?.submitTransaction(
            'addCandidate',
            electionId,
            candidateId,
            name,
            vision,
            imageUrl || ""
        );
        return this.getCandidates(electionId);
    }

    async deleteCandidate(electionId: string, candidateId: string): Promise<void> {
        await this.contract?.submitTransaction('deleteCandidate', electionId, candidateId);
    }

    async checkParticipation(voterEmail: string): Promise<boolean> {
        // Checks if user has physically/logically marked as "participated"
        const result = await this.contract?.evaluateTransaction('checkParticipation', voterEmail);
        return result?.toString() === 'true';
    }

    async recordParticipation(voterEmail: string): Promise<void> {
        await this.contract?.submitTransaction('recordParticipation', voterEmail);
    }

    async getBallots(electionId: string): Promise<any[]> {
        // Used for IRV calculation
        const result = await this.contract?.evaluateTransaction('getBallots', electionId);
        return JSON.parse(result?.toString() || '[]');
    }

    async hasVoted(electionId: string, tokenIdentifier: string): Promise<boolean> {
        const result = await this.contract?.evaluateTransaction('hasVoted', electionId, tokenIdentifier);
        return result?.toString() === 'true';
    }

    async getVote(electionId: string, tokenId: string): Promise<any> {
        try {
            const result = await this.contract?.evaluateTransaction('getVote', electionId, tokenId);
            if (!result || result.length === 0) return null;
            return JSON.parse(result.toString());
        } catch (error) {
            return null;
        }
    }
}

export const fabricService = new FabricService();