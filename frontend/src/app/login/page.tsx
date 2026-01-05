"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
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

	const [showPassword, setShowPassword] = useState(false);

	useEffect(() => {
		// Check for error in URL params
		const errorParam = searchParams.get("error");
		const message = searchParams.get("message");

		if (errorParam) {
			setError(message || "Terjadi kesalahan. Silakan coba lagi.");
			// Clean URL
			router.replace("/login", { scroll: false });
		} else if (message) {
			// Support showing success messages passed via URL
			setSuccess(message);
			// Clean URL so message doesn't persist on refresh or subsequent logins
			router.replace("/login", { scroll: false });
		}
	}, [searchParams, router]);

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
		setSuccess(null); // Clear any previous success message

		try {
			const data = await api.login({ nim, password });

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
							src="/favicon.png"
							alt="Logo Pemira"
							fill
							className="object-contain"
							priority
						/>
					</div>
				</div>

				<h1 className="text-3xl font-bold text-white mb-2">
					Pemira KM ITB
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
						<div className="relative">
							<input
								type={showPassword ? "text" : "password"}
								required
								className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition pr-12"
								placeholder="password123"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
							>
								{showPassword ? (
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
										<path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
									</svg>
								) : (
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
										<path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
										<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
								)}
							</button>
						</div>
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
