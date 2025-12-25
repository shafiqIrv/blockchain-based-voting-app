export interface SSOConfig {
	baseUrl: string;
	clientId: string;
	clientSecret: string;
	callbackUrl: string;
}

export interface SSOTokens {
	accessToken: string;
	refreshToken?: string;
	expiresIn: number;
}

export interface SSOUserInfo {
	nim: string;
	name: string;
	email: string;
	faculty: string;
	major: string;
	status: "active" | "inactive" | "graduated";
}

/**
 * SSO ITB Client
 * Handles OAuth2 flow with ITB's SSO system
 */
export class SSOClient {
	private config: SSOConfig;

	constructor(config: SSOConfig) {
		this.config = config;
	}

	/**
	 * Generate SSO login URL for redirect
	 */
	getLoginUrl(state?: string): string {
		const params = new URLSearchParams({
			client_id: this.config.clientId,
			redirect_uri: this.config.callbackUrl,
			response_type: "code",
			scope: "openid profile email",
			state: state || this.generateState(),
		});

		return `${this.config.baseUrl}/oauth2/authorize?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for tokens
	 */
	async exchangeCode(code: string): Promise<SSOTokens> {
		// TODO: Implement actual SSO ITB token exchange
		// This is a placeholder for the actual implementation

		const response = await fetch(`${this.config.baseUrl}/oauth2/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${Buffer.from(
					`${this.config.clientId}:${this.config.clientSecret}`
				).toString("base64")}`,
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: this.config.callbackUrl,
			}),
		});

		if (!response.ok) {
			throw new Error("Failed to exchange code for tokens");
		}

		const data = await response.json();

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresIn: data.expires_in,
		};
	}

	/**
	 * Get user info from SSO using access token
	 */
	async getUserInfo(accessToken: string): Promise<SSOUserInfo> {
		// TODO: Implement actual SSO ITB user info endpoint
		// This is a placeholder for the actual implementation

		const response = await fetch(`${this.config.baseUrl}/oauth2/userinfo`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error("Failed to get user info");
		}

		const data = await response.json();

		return {
			nim: data.nim || data.sub,
			name: data.name,
			email: data.email,
			faculty: data.faculty || data.organizational_unit,
			major: data.major || data.department,
			status: data.status || "active",
		};
	}

	private generateState(): string {
		return Math.random().toString(36).substring(2, 15);
	}
}
