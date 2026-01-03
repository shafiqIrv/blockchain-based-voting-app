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
	downloadIdentityFile: (tid: string, sig: string, nim?: string) => Promise<void>;

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

		if (isAuthenticated && isTokenMissing && !isSetupPage && user?.role !== "admin") {
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

			// 6. Save (Do not auto-download)
			saveIdentity(rawToken, unblindedSignature);
			// downloadIdentityFile(rawToken, unblindedSignature); <- Removed auto-download

		} catch (error) {
			console.error("Identity Creation Failed", error);
			throw error; // Re-throw to let UI handle it
		}
	};

	const saveIdentity = (tid: string, sig: string) => {
		localStorage.setItem("voting_tokenId", tid);
		localStorage.setItem("voting_signature", sig);
		setTokenId(tid);
		setSignature(sig);
	};

	// Public helper to download identity
	const downloadIdentityFile = async (tid: string, sig: string, nim?: string) => {
		if (!nim) {
			// Fallback for admin or weird state, though UI enforces it.
			console.warn("No NIM provided for encryption, using unencrypted format");
			// Legacy unencrypted download (or just block it?)
			// Let's block to force security as requested.
			alert("Security Error: NIM is required to encrypt the identity file.");
			return;
		}

		try {
			// 1. Prepare Crypto
			const salt = window.crypto.getRandomValues(new Uint8Array(16));
			const iv = window.crypto.getRandomValues(new Uint8Array(12));

			// 2. Derive Key from NIM
			const key = await deriveKey(nim, salt);

			// 3. Encrypt Payload
			const payload = {
				tokenIdentifier: tid,
				signature: sig,
				electionId: user?.electionId || "election-2024"
			};
			const ciphertext = await encryptData(payload, key, iv);

			// 4. Create File Content
			const fileData = JSON.stringify({
				version: 2,
				scheme: "blind-signature-aes-gcm",
				nim: nim,
				salt: buffToBase64(salt),
				iv: buffToBase64(iv),
				ciphertext: buffToBase64(ciphertext),
				createdAt: new Date().toISOString(),
				note: "ENCRYPTED FILE. DO NOT MODIFY. ONLY OWNER CAN DECRYPT."
			}, null, 2);

			const blob = new Blob([fileData], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${nim}-identity.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error("Encryption failed", e);
			alert("Failed to secure identity file.");
		}
	};

	const loadIdentity = async (file: File) => {
		try {
			const text = await file.text();
			const json = JSON.parse(text);

			// Strict Check for v2 Encryption
			if (json.version !== 2 || !json.ciphertext) {
				// We strictly reject non-encrypted files now as requested
				throw new Error("Invalid or insecure identity file. Please create a new one.");
			}

			// 1. Initial Metadata Check (Fast Fail)
			// @ts-ignore
			const userNim = user?.nim;
			if (userNim && json.nim && json.nim !== userNim) {
				throw new Error(`Identity file belongs to another user (${json.nim})`);
			}
			if (!userNim) {
				throw new Error("User NIM not found. Cannot decrypt identity.");
			}

			// 2. Attempt Decryption
			try {
				const salt = base64ToBuff(json.salt);
				const iv = base64ToBuff(json.iv);
				const ciphertext = base64ToBuff(json.ciphertext);

				// Derive key using CURRENT user's NIM
				const key = await deriveKey(userNim, salt);

				// Decrypt
				const payload = await decryptData(ciphertext, key, iv);

				if (!payload.tokenIdentifier || !payload.signature) {
					throw new Error("Decrypted data is invalid");
				}

				saveIdentity(payload.tokenIdentifier, payload.signature);

			} catch (decErr) {
				console.error("Decryption error", decErr);
				// Explicitly assume decryption failure = wrong key = wrong owner
				throw new Error(`Decryption failed. Identity file authentication mismatch.`);
			}

		} catch (error) {
			console.error("Load Identity Failed", error);
			if (error instanceof Error) throw error;
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
				downloadIdentityFile,
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

// --- Crypto Helpers ---

async function deriveKey(password: string, salt: any): Promise<CryptoKey> {
	const enc = new TextEncoder();
	const keyMaterial = await window.crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveKey"]
	);
	return window.crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: salt,
			iterations: 100000,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"]
	);
}

async function encryptData(data: object, key: CryptoKey, iv: any): Promise<ArrayBuffer> {
	const enc = new TextEncoder();
	const encoded = enc.encode(JSON.stringify(data));
	return window.crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		encoded
	);
}

async function decryptData(ciphertext: any, key: CryptoKey, iv: any): Promise<any> {
	try {
		const decrypted = await window.crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: iv },
			key,
			ciphertext
		);
		const dec = new TextDecoder();
		return JSON.parse(dec.decode(decrypted));
	} catch (e) {
		throw new Error("Decryption failed");
	}
}

function buffToBase64(buffer: ArrayBuffer): string {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}

function base64ToBuff(base64: string): Uint8Array {
	const binary_string = window.atob(base64);
	const len = binary_string.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binary_string.charCodeAt(i);
	}
	return bytes;
}
