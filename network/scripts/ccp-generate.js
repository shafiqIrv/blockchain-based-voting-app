const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const NETWORK_DIR = path.dirname(SCRIPT_DIR);

function getOneLinePem(pemPath) {
    try {
        const pemContent = fs.readFileSync(pemPath, 'utf8');
        // Remove newlines and escape for JSON string
        return pemContent.replace(/\n/g, '\\n').replace(/\r/g, '');
    } catch (error) {
        console.error(`Error reading PEM file at ${pemPath}:`, error);
        process.exit(1);
    }
}

function generateConnectionProfile() {
    const templatePath = path.join(SCRIPT_DIR, 'ccp-template.json');
    const pemPath = path.join(NETWORK_DIR, 'organizations/peerOrganizations/itb.ac.id/tlsca/tlsca.itb.ac.id-cert.pem');
    const outputPath = path.join(NETWORK_DIR, 'connection.json');

    try {
        let template = fs.readFileSync(templatePath, 'utf8');
        const peerPem = getOneLinePem(pemPath);

        // Replace variable in template
        const connectionProfile = template.replace(/\${PEERPEM}/g, peerPem);

        fs.writeFileSync(outputPath, connectionProfile);
        console.log(`Successfully generated connection.json at ${outputPath}`);
    } catch (error) {
        console.error('Error generating connection profile:', error);
        process.exit(1);
    }
}

generateConnectionProfile();
