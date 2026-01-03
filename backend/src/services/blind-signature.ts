import { generateKeyPairSync, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface RSAKeyPair {
    publicKey: {
        n: string; // Modulus (hex)
        e: string; // Public exponent (hex)
    };
    privateKey: {
        n: string; // Modulus (hex)
        d: string; // Private exponent (hex)
    };
}

export class BlindSignatureService {
    private keyPair: RSAKeyPair | null = null;
    private readonly KEYS_DIR = path.join(process.cwd(), 'data');
    private readonly KEYS_FILE = path.join(process.cwd(), 'data', 'voting-keys.json');

    constructor() {
        this.initializeKeys();
    }

    private initializeKeys() {
        try {
            // Ensure directory exists
            if (!fs.existsSync(this.KEYS_DIR)) {
                fs.mkdirSync(this.KEYS_DIR, { recursive: true });
            }

            // Try to load existing keys
            if (fs.existsSync(this.KEYS_FILE)) {
                try {
                    const data = fs.readFileSync(this.KEYS_FILE, 'utf-8');
                    this.keyPair = JSON.parse(data);
                    console.log("✅ RSA Keys loaded from storage");
                    return;
                } catch (e) {
                    console.error("Failed to load keys, generating new ones", e);
                }
            }

            // Generate new RSA 2048 keys
            console.log("Generating new RSA keys...");
            const { privateKey, publicKey } = generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'pkcs1',
                    format: 'jwk',
                },
                privateKeyEncoding: {
                    type: 'pkcs1',
                    format: 'jwk',
                },
            }) as any;

            if (!publicKey.n || !publicKey.e || !privateKey.d || !privateKey.n) {
                throw new Error("Failed to generate valid RSA keys");
            }

            this.keyPair = {
                publicKey: {
                    n: this.base64UrlToHex(publicKey.n),
                    e: this.base64UrlToHex(publicKey.e),
                },
                privateKey: {
                    n: this.base64UrlToHex(privateKey.n),
                    d: this.base64UrlToHex(privateKey.d),
                }
            };

            // Save keys to file
            fs.writeFileSync(this.KEYS_FILE, JSON.stringify(this.keyPair, null, 2));
            console.log("✅ New RSA Keys generated and saved to storage");

        } catch (error) {
            console.error("Critical Error initializing keys:", error);
            // Fallback to memory-only keys if filesystem fails (should not happen in dev)
            this.generateTemporaryKeys();
        }
    }

    private generateTemporaryKeys() {
        const { privateKey, publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'pkcs1', format: 'jwk' },
            privateKeyEncoding: { type: 'pkcs1', format: 'jwk' },
        }) as any;

        this.keyPair = {
            publicKey: { n: this.base64UrlToHex(publicKey.n!), e: this.base64UrlToHex(publicKey.e!) },
            privateKey: { n: this.base64UrlToHex(privateKey.n!), d: this.base64UrlToHex(privateKey.d!) }
        };
    }

    private base64UrlToHex(str: string): string {
        return Buffer.from(str, 'base64url').toString('hex');
    }

    private hexToBigInt(hex: string): bigint {
        return BigInt('0x' + hex);
    }

    private bigIntToHex(num: bigint): string {
        return num.toString(16);
    }

    public getPublicKey() {
        if (!this.keyPair) this.initializeKeys();
        return this.keyPair!.publicKey;
    }

    // Modular Exponentiation: (base ^ exponent) % modulus
    private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
        let result = BigInt(1);
        base = base % modulus;

        while (exponent > BigInt(0)) {
            if (exponent % BigInt(2) === BigInt(1)) {
                result = (result * base) % modulus;
            }
            base = (base * base) % modulus;
            exponent = exponent / BigInt(2);
        }

        return result;
    }

    /**
     * Signs a blinded message (number)
     * Signature s = m' ^ d mod n
     */
    public signBlinded(blindedMessageHex: string): string {
        if (!this.keyPair) this.initializeKeys();

        const m_prime = this.hexToBigInt(blindedMessageHex);
        const d = this.hexToBigInt(this.keyPair!.privateKey.d);
        const n = this.hexToBigInt(this.keyPair!.privateKey.n);

        const s_prime = this.modPow(m_prime, d, n);

        return this.bigIntToHex(s_prime);
    }

    /**
     * Verifies a signature (standard RSA verification for unblinded message)
     * s ^ e mod n == H(m)
     * In our case our "message" is the Token ID itself (hashed usually)
     */
    public verify(message: string, signatureHex: string): boolean {
        if (!this.keyPair) this.initializeKeys();

        // Hash the message first to match what was blinded on client
        // Client blinds Hash(Token) usually, or Token if it's random enough.
        // Let's assume the input `message` is the raw Token String.
        // We can treat the Token string directly as the number if it's hex, 
        // OR we hash it to be safe and ensure it fits in modulus.

        // Protocol: 
        // 1. Client creates Random Token T
        // 2. Client computes H = Hash(T) (as BigInt)
        // 3. Client blinds H -> B
        // 4. Server signs B -> S_blind
        // 5. Client unblinds S_blind -> S
        // 6. Verify: S^e mod n == H

        const n = this.hexToBigInt(this.keyPair!.publicKey.n);
        const e = this.hexToBigInt(this.keyPair!.publicKey.e);
        const s = this.hexToBigInt(signatureHex);

        // 1. Calculate S^e mod n
        const calculatedHashBigInt = this.modPow(s, e, n);
        const calculatedHash = this.bigIntToHex(calculatedHashBigInt); // This is H'

        // 2. Calculate actual Hash(message)
        const actualHash = createHash('sha256').update(message).digest('hex');

        // Compare (converting to BigInt to ignore leading zeros issues in hex string eq)
        return this.hexToBigInt(calculatedHash) === this.hexToBigInt(actualHash);
    }
}

export const blindSignatureService = new BlindSignatureService();
