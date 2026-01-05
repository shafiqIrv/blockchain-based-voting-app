import FabricCAServices from 'fabric-ca-client';
import { Wallets, X509Identity } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        // Paths
        const walletPath = path.join(process.cwd(), 'wallet');
        const org1Path = path.resolve(__dirname, '../../network/organizations/peerOrganizations/itb.ac.id');
        const certPath = path.join(org1Path, 'users/Admin@itb.ac.id/msp/signcerts/Admin@itb.ac.id-cert.pem');
        const keyPath = path.join(org1Path, 'users/Admin@itb.ac.id/msp/keystore');

        // Check if crypto material exists
        if (!fs.existsSync(certPath)) {
            throw new Error(`Certificate not found at: ${certPath}`);
        }

        // Find the Private Key (filename is random hash)
        const keyFiles = fs.readdirSync(keyPath);
        const keyFile = keyFiles.find(f => f.endsWith('_sk'));
        if (!keyFile) {
            throw new Error(`Private key not found in: ${keyPath}`);
        }
        const privateKeyPath = path.join(keyPath, keyFile);

        // Read files
        const certificate = fs.readFileSync(certPath).toString();
        const privateKey = fs.readFileSync(privateKeyPath).toString();

        // Create Wallet
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Identity
        const identity: X509Identity = {
            credentials: {
                certificate,
                privateKey
            },
            mspId: 'ITBMSP', // Matched from ccp-template.json
            type: 'X.509'
        };

        // Import into wallet
        await wallet.put('admin', identity);
        console.log('Successfully imported "admin" identity into the wallet');

    } catch (error) {
        console.error(`Failed to enroll admin: ${error}`);
        process.exit(1);
    }
}

main();
