import { Wallets } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    try {
        const walletPath = path.resolve(process.env.FABRIC_WALLET_PATH || './wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if we already enrolled
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
            return;
        }

        // Path to crypto materials (Admin of ITB)
        const credPath = path.resolve(process.env.FABRIC_CRED_PATH || '../network/organizations/peerOrganizations/itb.ac.id/users/Admin@itb.ac.id/msp');

        if (!fs.existsSync(credPath)) {
            throw new Error(`Credential path not found: ${credPath}. Make sure the network is started.`);
        }

        const certPath = path.join(credPath, 'signcerts', 'Admin@itb.ac.id-cert.pem');

        // Key path is variable (sk file)
        const keyDir = path.join(credPath, 'keystore');
        const keyFiles = fs.readdirSync(keyDir);
        const keyPath = path.join(keyDir, keyFiles[0]);

        const certificate = fs.readFileSync(certPath).toString();
        const privateKey = fs.readFileSync(keyPath).toString();

        const mspId = process.env.FABRIC_MSP_ID || 'ITBMSP';
        const x509Identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: mspId,
            type: 'X.509',
        };

        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
    } catch (error) {
        console.error('Failed to enroll admin:', error);
        process.exit(1);
    }
}

main();
