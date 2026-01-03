"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { api, User } from "@/lib/api";
import { blindSignatureClient } from "./blind-signature";
import { usePathname, useRouter } from "next/navigation";

interface AuthContextType {
	user: User | null;
	tokenId: string | null;     // The Token Identifier (Unblinded)
	signature: string | null;   // The Blind Signature

	isLoading: boolean;
	isAuthenticated: boolean;
	isTokenMissing: boolean;    // True if logged in but no token found

	login: () => Promise<void>;
	logout: () => void;

	createIdentity: () => Promise<void>;
	loadIdentity: (file: File) => Promise<void>;

	// Legacy support for callback (sets session only)
	setAuthData: (token: string, tid: string, userData?: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [tokenId, setTokenId] = useState<string | null>(null);
	const [signature, setSignature] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Derived state: Logged in but missing local voting token
	const isTokenMissing = !!user && !tokenId;
	const isAuthenticated = !!user;

	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		checkAuth();
	}, []);

	const checkAuth = async () => {
		const token = api.getToken();

		// Load voting identity from localStorage
		const storedTokenId = localStorage.getItem("voting_tokenId");
		const storedSignature = localStorage.getItem("voting_signature");

		if (token) {
			try {
				const userData = await api.getMe();
				setUser(userData);

				if (storedTokenId && storedSignature) {
					setTokenId(storedTokenId);
					setSignature(storedSignature);
				}
				// If missing token, let the useEffect below handle redirect
			} catch (error) {
				console.error("Auth Check Failed", error);
				api.clearToken();
			}
		}
		setIsLoading(false);
	};

	// Redirect Effect
	useEffect(() => {
		if (isLoading) return;

		const isPublicPage = ["/login", "/", "/results", "/auth/callback"].includes(pathname);
		const isSetupPage = pathname === "/setup-identity";

		if (isAuthenticated && isTokenMissing && !isSetupPage) {
			router.push("/setup-identity");
		}

	}, [isAuthenticated, isTokenMissing, pathname, isLoading, router]);

	const login = async () => {
		const { loginUrl } = await api.getLoginUrl();
		window.location.href = loginUrl;
	};

	const logout = () => {
		api.clearToken();
		localStorage.removeItem("voting_tokenId");
		localStorage.removeItem("voting_signature");
		setUser(null);
		setTokenId(null);
		setSignature(null);
	};

	const createIdentity = async () => {
		if (!user) return;

		try {
			// 1. Get Admin Public Key
			const keys = await api.getVotingKeys();
			const publicKey = keys.publicKey;

			// 2. Generate Random Token & Blind It
			// We use a random UUID as the base token
			const rawToken = crypto.randomUUID();
			const { blinded, r } = await blindSignatureClient.blind(rawToken, publicKey);

			// 3. Request Blind Signature
			const data = await api.registerVoting(blinded);

			// 4. Unblind Signature
			const unblindedSignature = blindSignatureClient.unblind(
				data.blindSignature,
				r,
				publicKey
			);

			// 5. Verify (Sanity Check) - Check if signature matches our token
			// Note: In real app, we should verify signature using verify(rawToken, unblindedSignature)

			// 6. Save & Download
			saveIdentity(rawToken, unblindedSignature);
			downloadIdentityFile(rawToken, unblindedSignature);

		} catch (error) {
			console.error("Identity Creation Failed", error);
			alert("Failed to create identity: " + (error as any).message);
		}
	};

	const saveIdentity = (tid: string, sig: string) => {
		localStorage.setItem("voting_tokenId", tid);
		localStorage.setItem("voting_signature", sig);
		setTokenId(tid);
		setSignature(sig);
	};

	const downloadIdentityFile = (tid: string, sig: string) => {
		const data = JSON.stringify({
			scheme: "blind-signature-rsa-2048",
			electionId: user?.electionId || "election-2024",
			tokenIdentifier: tid,
			signature: sig,
			createdAt: new Date().toISOString(),
			note: "KEEP THIS FILE SAFE. IT IS YOUR ONLY WA TO VOTE."
		}, null, 2);

		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "voting-identity.json";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const loadIdentity = async (file: File) => {
		try {
			const text = await file.text();
			const json = JSON.parse(text);

			if (!json.tokenIdentifier || !json.signature) {
				throw new Error("Invalid identity file");
			}

			saveIdentity(json.tokenIdentifier, json.signature);
		} catch (error) {
			console.error("Load Identity Failed", error);
			throw new Error("Failed to load identity file");
		}
	};

	const setAuthData = (token: string, tid: string, userData?: User) => {
		api.setToken(token);
		// We INTENTIONALLY ignore 'tid' (legacy token) here.
		// We want the user to go through the Blind Signature flow (createIdentity).
		// So we do NOT set 'voting_tokenId' in localStorage yet.

		if (userData) {
			setUser(userData);
		} else {
			api.getMe().then(setUser).catch(console.error);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				tokenId,
				signature,
				isLoading,
				isAuthenticated: !!user,
				isTokenMissing,
				login,
				logout,
				createIdentity,
				loadIdentity,
				setAuthData
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
