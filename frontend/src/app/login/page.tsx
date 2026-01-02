"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
	const { setAuthData, isAuthenticated, isLoading } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [nim, setNim] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		// Check for error in URL params
		const errorParam = searchParams.get("error");
		const message = searchParams.get("message");

		if (errorParam) {
			setError(message || "Terjadi kesalahan. Silakan coba lagi.");
		} else if (message) {
			// Support showing success messages passed via URL
			setSuccess(message);
		}
	}, [searchParams]);

	useEffect(() => {
		// Redirect if already authenticated
		if (!isLoading && isAuthenticated) {
			router.push("/");
		}
	}, [isAuthenticated, isLoading, router]);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		try {
			const res = await fetch("http://localhost:3002/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ nim, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Login failed");
			}

			// Success: Set auth data (token and tokenId)
			// This triggers the auth context to fetch user profile from backend
			setAuthData(data.token, data.tokenId, data.user);

			// Redirect happens automatically via useEffect above when isAuthenticated becomes true

		} catch (err: any) {
			setError(err.message || "Gagal masuk. Periksa NIM dan password Anda.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<main className="min-h-screen flex items-center justify-center">
				<div className="spinner"></div>
			</main>
		);
	}

	return (
		<main className="min-h-screen flex items-center justify-center px-6">
			<div className="glass p-10 max-w-md w-full text-center animate-fadeIn border border-white/10 rounded-2xl bg-white/5 backdrop-blur-lg">
				{/* Logo */}
				<div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6 p-4">
					<div className="relative w-full h-full">
						<Image
							src="/public/logo.png"
							alt="ITB Logo"
							fill
							className="object-contain"
							priority
						/>
					</div>
				</div>

				<h1 className="text-3xl font-bold text-white mb-2">
					ITB Voting
				</h1>
				<p className="text-gray-400 mb-8">
					Masuk untuk melakukan voting (Local Mode)
				</p>

				{error && (
					<div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
						<p className="text-red-400 text-sm">{error}</p>
					</div>
				)}

				{success && (
					<div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
						<p className="text-green-400 text-sm">{success}</p>
					</div>
				)}

				<form onSubmit={handleLogin} className="space-y-4 text-left">
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">
							NIM
						</label>
						<input
							type="text"
							required
							className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
							placeholder="13521001"
							value={nim}
							onChange={(e) => setNim(e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">
							Password
						</label>
						<input
							type="password"
							required
							className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
							placeholder="password123"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						className="btn btn-primary w-full text-lg py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mt-4"
					>
						{isSubmitting ? "Memproses..." : "Masuk"}
					</button>
				</form>

				<div className="mt-8 text-sm text-gray-400">
					Don't have an account?{" "}
					<Link
						href="/register"
						className="text-indigo-400 hover:text-indigo-300 font-medium"
					>
						Register here
					</Link>
				</div>

				<p className="text-sm text-gray-500 mt-6">
					Gunakan akun mock: 13521001 / password123
				</p>
			</div>
		</main>
	);
}
