"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { api, User } from "@/lib/api";

interface AuthContextType {
	user: User | null;
	tokenId: string | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: () => Promise<void>;
	logout: () => void;
	setAuthData: (token: string, tokenId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [tokenId, setTokenId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Check for existing auth on mount
		const checkAuth = async () => {
			const token = api.getToken();
			const storedTokenId = localStorage.getItem("voting_tokenId");

			if (token) {
				try {
					const userData = await api.getMe();
					setUser(userData);
					setTokenId(storedTokenId);
				} catch (error) {
					// Token invalid, clear it
					api.clearToken();
				}
			}
			setIsLoading(false);
		};

		checkAuth();
	}, []);

	const login = async () => {
		const { loginUrl } = await api.getLoginUrl();
		window.location.href = loginUrl;
	};

	const logout = () => {
		api.clearToken();
		setUser(null);
		setTokenId(null);
	};

	const setAuthData = (token: string, tid: string) => {
		api.setToken(token);
		localStorage.setItem("voting_tokenId", tid);
		setTokenId(tid);

		// Fetch user data
		api.getMe().then(setUser).catch(console.error);
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				tokenId,
				isLoading,
				isAuthenticated: !!user,
				login,
				logout,
				setAuthData,
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
