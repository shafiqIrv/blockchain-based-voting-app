export class BlindSignatureClient {
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

    // Modern browsers support window.crypto
    private getRandomValues(length: number): Uint8Array {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return array;
    }

    private arrayBufferToHex(buffer: ArrayBuffer): string {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private hexToBigInt(hex: string): bigint {
        return BigInt('0x' + hex);
    }

    private bigIntToHex(num: bigint): string {
        return num.toString(16);
    }

    /**
     * Generates a random blinding factor 'r' such that gcd(r, n) = 1
     */
    private generateBlindingFactor(n: bigint): bigint {
        let r: bigint;
        do {
            const randomBytes = this.getRandomValues(32); // 256 bits
            const randomHex = this.arrayBufferToHex(randomBytes);
            r = this.hexToBigInt(randomHex) % n;
        } while (this.gcd(r, n) !== BigInt(1) || r < BigInt(2));
        return r;
    }

    private gcd(a: bigint, b: bigint): bigint {
        while (b !== BigInt(0)) {
            let temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    // Extended Euclidean Algorithm to find modular inverse
    private modInv(a: bigint, m: bigint): bigint {
        let m0 = m;
        let y = BigInt(0);
        let x = BigInt(1);

        if (m === BigInt(1)) return BigInt(0);

        while (a > BigInt(1)) {
            let q = a / m;
            let t = m;

            m = a % m;
            a = t;
            t = y;

            y = x - q * y;
            x = t;
        }

        if (x < BigInt(0)) x += m0;

        return x;
    }

    /**
     * Step 1: Blind the message (Token)
     * B = (Hash(m) * r^e) mod n
     */
    public async blind(token: string, publicKey: { n: string, e: string }): Promise<{ blinded: string, r: string }> {
        const n = this.hexToBigInt(publicKey.n);
        const e = this.hexToBigInt(publicKey.e);

        // 1. Hash the token to ensure uniform distribution
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashHex = this.arrayBufferToHex(hashBuffer);
        const m = this.hexToBigInt(hashHex);

        // 2. Generate random blinding factor r
        const r = this.generateBlindingFactor(n);

        // 3. Compute B = (m * r^e) mod n
        const r_pow_e = this.modPow(r, e, n);
        const blinded = (m * r_pow_e) % n;

        return {
            blinded: this.bigIntToHex(blinded),
            r: this.bigIntToHex(r)
        };
    }

    /**
     * Step 3: Unblind the signature
     * S = S_blind * r^-1 mod n
     */
    public unblind(blindSignature: string, rHex: string, publicKey: { n: string }): string {
        const n = this.hexToBigInt(publicKey.n);
        const s_blind = this.hexToBigInt(blindSignature);
        const r = this.hexToBigInt(rHex);

        const r_inv = this.modInv(r, n);

        const s = (s_blind * r_inv) % n;

        return this.bigIntToHex(s);
    }
}

export const blindSignatureClient = new BlindSignatureClient();
