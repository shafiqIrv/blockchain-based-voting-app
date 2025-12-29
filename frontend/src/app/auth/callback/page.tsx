"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AuthCallbackPage() {
	const { setAuthData } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const token = searchParams.get("token");
		const tokenId = searchParams.get("tokenId");
		const error = searchParams.get("error");

		if (error) {
			router.push(`/login?error=${error}`);
			return;
		}

		if (token && tokenId) {
			setAuthData(token, tokenId);
			router.push("/vote");
		} else {
			router.push("/login?error=missing_token");
		}
	}, [searchParams, setAuthData, router]);

	return (
		<main className="min-h-screen flex items-center justify-center">
			<div className="text-center">
				<div className="spinner mx-auto mb-4"></div>
				<p className="text-gray-400">Memproses autentikasi...</p>
			</div>
		</main>
	);
}
