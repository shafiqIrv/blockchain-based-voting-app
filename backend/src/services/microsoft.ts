export interface MicrosoftTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
	refresh_token?: string;
	id_token?: string;
}

export interface MicrosoftUserInfo {
	id: string;
	displayName: string;
	givenName: string;
	surname: string;
	mail: string;
	userPrincipalName: string;
}

export class MicrosoftOAuthService {
	private clientId: string;
	private clientSecret: string;
	private tenantId: string;
	private redirectUri: string;

	constructor() {
		this.clientId = process.env.MICROSOFT_CLIENT_ID || "";
		this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET || "";
		this.tenantId = process.env.MICROSOFT_TENANT_ID || "common";
		this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || "";
	}

	/**
	 * Generate Microsoft OAuth login URL
	 */
	getLoginUrl(state?: string): string {
		const params = new URLSearchParams({
			client_id: this.clientId,
			response_type: "code",
			redirect_uri: this.redirectUri,
			response_mode: "query",
			scope: "openid profile email User.Read",
			state: state || this.generateState(),
		});

		return `https://login.microsoftonline.com/${
			this.tenantId
		}/oauth2/v2.0/authorize?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for tokens
	 */
	async exchangeCodeForTokens(code: string): Promise<MicrosoftTokenResponse> {
		const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

		const params = new URLSearchParams({
			client_id: this.clientId,
			client_secret: this.clientSecret,
			code,
			redirect_uri: this.redirectUri,
			grant_type: "authorization_code",
			scope: "openid profile email User.Read",
		});

		const response = await fetch(tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to exchange code: ${error}`);
		}

		return response.json() as Promise<MicrosoftTokenResponse>;
	}

	/**
	 * Get user info from Microsoft Graph API
	 */
	async getUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
		const response = await fetch("https://graph.microsoft.com/v1.0/me", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to get user info: ${error}`);
		}

		return response.json() as Promise<MicrosoftUserInfo>;
	}

	/**
	 * Validate if email is from ITB student domain
	 */
	isValidITBStudent(email: string): boolean {
		return email.toLowerCase().endsWith("@mahasiswa.itb.ac.id");
	}

	/**
	 * Get email from user info (prefer mail, fallback to userPrincipalName)
	 */
	getEmail(userInfo: MicrosoftUserInfo): string {
		return userInfo.mail || userInfo.userPrincipalName;
	}

	private generateState(): string {
		return (
			Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15)
		);
	}
}

export const microsoftOAuth = new MicrosoftOAuthService();
