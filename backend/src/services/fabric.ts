import * as fs from 'fs';
import * as path from 'path';
import { Gateway, Wallets, Contract, Network } from 'fabric-network';

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
        const result = await this.contract?.evaluateTransaction('getElectionStatus', electionId);
        return JSON.parse(result?.toString() || '{}');
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
}

export const fabricService = new FabricService();