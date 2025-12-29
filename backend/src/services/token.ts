import { createHmac } from "crypto";
import jwt from "jsonwebtoken";

export interface VotingTokens {
	tokenIdentifier: string;
	jwt: string;
}

export class TokenService {
	private secret: string;
	private jwtSecret: string;

	constructor() {
		this.secret = process.env.TOKEN_SECRET || "default-token-secret";
		this.jwtSecret = process.env.JWT_SECRET || "default-jwt-secret";
	}

	/**
	 * Generate a deterministic token identifier from email and election ID
	 * This ensures:
	 * - Same email + same election = same token (prevents double voting)
	 * - Cannot reverse to get email
	 * - Different for each election
	 */
	generateTokenIdentifier(email: string, electionId: string): string {
		const data = `${email.toLowerCase()}:${electionId}`;
		const hmac = createHmac("sha256", this.secret);
		hmac.update(data);
		return hmac.digest("hex");
	}

	/**
	 * Generate JWT for session authentication
	 */
	generateJWT(payload: {
		email: string;
		name: string;
		tokenIdentifier: string;
		electionId: string;
	}): string {
		return jwt.sign(payload, this.jwtSecret, {
			expiresIn: "24h",
		});
	}

	/**
	 * Generate both tokens for a voter
	 */
	generateVotingTokens(
		email: string,
		name: string,
		electionId: string
	): VotingTokens {
		const tokenIdentifier = this.generateTokenIdentifier(email, electionId);

		const jwt = this.generateJWT({
			email,
			name,
			tokenIdentifier,
			electionId,
		});

		return {
			tokenIdentifier,
			jwt,
		};
	}
}

export const tokenService = new TokenService();
