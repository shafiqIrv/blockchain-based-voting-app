"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
	const { login, isAuthenticated, isLoading } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Check for error in URL params
		const errorParam = searchParams.get("error");
		const message = searchParams.get("message");

		if (errorParam) {
			if (errorParam === "invalid_domain") {
				setError(
					message ||
						"Hanya mahasiswa ITB yang dapat mengakses sistem voting"
				);
			} else if (errorParam === "auth_failed") {
				setError("Autentikasi gagal. Silakan coba lagi.");
			} else {
				setError("Terjadi kesalahan. Silakan coba lagi.");
			}
		}
	}, [searchParams]);

	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			router.push("/vote");
		}
	}, [isAuthenticated, isLoading, router]);

	if (isLoading) {
		return (
			<main className="min-h-screen flex items-center justify-center">
				<div className="spinner"></div>
			</main>
		);
	}

	return (
		<main className="min-h-screen flex items-center justify-center px-6">
			<div className="glass p-10 max-w-md w-full text-center animate-fadeIn">
				{/* Logo */}
				<div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
					<span className="text-4xl">🗳️</span>
				</div>

				<h1 className="text-3xl font-bold text-white mb-2">
					ITB Voting
				</h1>
				<p className="text-gray-400 mb-8">
					Masuk dengan akun Microsoft ITB untuk melakukan voting
				</p>

				{error && (
					<div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
						<p className="text-red-400 text-sm">{error}</p>
					</div>
				)}

				<button
					onClick={login}
					className="btn btn-primary w-full text-lg py-4"
				>
					<svg
						className="w-6 h-6"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
					</svg>
					Login dengan Microsoft
				</button>

				<p className="text-sm text-gray-500 mt-6">
					Hanya untuk mahasiswa ITB dengan email @mahasiswa.itb.ac.id
				</p>
			</div>
		</main>
	);
}
