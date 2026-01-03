"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, VoteVerification } from "@/lib/api";

export default function VerifyPage() {
	const { tokenId, isAuthenticated } = useAuth();

	const [inputTokenId, setInputTokenId] = useState("");
	const [verification, setVerification] = useState<VoteVerification | null>(
		null
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isAuthenticated && tokenId) {
			setInputTokenId(tokenId);
			handleVerify(tokenId);
		}
	}, [isAuthenticated, tokenId]);

	async function handleVerify(tokenToVerify?: string) {
		const token = tokenToVerify || inputTokenId;
		if (!token || !token.trim()) return;

		setIsLoading(true);
		setError(null);
		setVerification(null);

		try {
			const result = await api.verifyVote(token, "election-2024");
			setVerification(result);
		} catch (err: any) {
			setError(err.message || "Gagal memverifikasi suara");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<main className="min-h-screen py-24 px-6">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12 animate-fadeIn">
					<Link href="/" className="inline-block mb-6">
						<span className="text-gray-400 hover:text-white transition">
							← Kembali
						</span>
					</Link>
					<h1 className="text-4xl font-bold text-white mb-4">
						🔍 Verifikasi Suara
					</h1>
					<p className="text-gray-400">
						Masukkan token verifikasi untuk memastikan suara Anda
						tercatat di blockchain
					</p>
				</div>

				{/* Verification Form */}
				<div className="glass p-8 mb-8 animate-fadeIn stagger-1">
					{isAuthenticated && tokenId ? (
						<div className="text-center">
							<p className="text-sm text-gray-400 mb-2">Token Verifikasi Anda</p>
							<div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 font-mono text-indigo-300 break-all select-all">
								{tokenId}
							</div>
							{!verification && (
								<button
									onClick={() => handleVerify(tokenId)}
									disabled={isLoading}
									className="btn btn-primary w-full"
								>
									{isLoading ? (
										<div className="spinner w-5 h-5 border-2"></div>
									) : (
										"Verifikasi Sekarang"
									)}
								</button>
							)}
						</div>
					) : (
						<>
							<label className="block text-sm text-gray-400 mb-2">
								Token Verifikasi
							</label>
							<div className="flex gap-3">
								<input
									type="text"
									value={inputTokenId}
									onChange={(e) => setInputTokenId(e.target.value)}
									placeholder="Masukkan token verifikasi..."
									className="input-glass flex-1 font-mono"
								/>
								<button
									onClick={() => handleVerify()}
									disabled={isLoading || !inputTokenId.trim()}
									className="btn btn-primary"
								>
									{isLoading ? (
										<div className="spinner w-5 h-5 border-2"></div>
									) : (
										"Verifikasi"
									)}
								</button>
							</div>
						</>
					)}
				</div>

				{/* Error */}
				{error && (
					<div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 animate-fadeIn">
						<p className="text-red-400 text-center">{error}</p>
					</div>
				)}

				{/* Verification Result */}
				{verification && (
					<div className="glass p-8 animate-fadeIn">
						{verification.found ? (
							<>
								<div className="flex items-center gap-3 mb-6">
									<div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
										<span className="text-2xl">✓</span>
									</div>
									<div>
										<h3 className="text-xl font-semibold text-white">
											Suara Ditemukan
										</h3>
										<p className="text-green-400 text-sm">
											Tercatat di blockchain
										</p>
									</div>
								</div>

								<div className="space-y-4">
									<div className="glass-sm p-4">
										<p className="text-xs text-gray-500 mb-1">
											Token Identifier
										</p>
										<p className="font-mono text-sm text-white break-all">
											{verification.vote?.tokenIdentifier}
										</p>
									</div>

									<div className="glass-sm p-4">
										<p className="text-xs text-gray-500 mb-1">
											Election ID
										</p>
										<p className="font-mono text-sm text-white">
											{verification.vote?.electionId}
										</p>
									</div>

									<div className="glass-sm p-4">
										<p className="text-xs text-gray-500 mb-1">
											Timestamp
										</p>
										<p className="text-sm text-white">
											{verification.vote?.timestamp
												? new Date(
													verification.vote.timestamp
												).toLocaleString("id-ID")
												: "-"}
										</p>
									</div>
								</div>

								<div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
									<p className="text-sm text-indigo-300">
										ℹ️ Detail pilihan Anda dienkripsi dan
										hanya Anda yang dapat memverifikasi
										bahwa suara tercatat dengan benar.
									</p>
								</div>
							</>
						) : (
							<>
								<div className="flex items-center gap-3 mb-4">
									<div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
										<span className="text-2xl">⚠️</span>
									</div>
									<div>
										<h3 className="text-xl font-semibold text-white">
											Suara Tidak Ditemukan
										</h3>
										<p className="text-yellow-400 text-sm">
											Token tidak valid atau belum voting
										</p>
									</div>
								</div>
								<p className="text-gray-400 text-sm">
									{verification.message ||
										"Pastikan token yang dimasukkan benar, atau Anda belum melakukan voting."}
								</p>
							</>
						)}
					</div>
				)}

				{/* Info */}
				<div className="mt-8 glass-sm p-6 animate-fadeIn stagger-2">
					<h4 className="text-white font-semibold mb-3">
						Bagaimana cara kerja verifikasi?
					</h4>
					<ul className="text-gray-400 text-sm space-y-2">
						<li>
							• Token verifikasi diberikan saat Anda melakukan
							voting
						</li>
						<li>
							• Token ini bersifat unik dan tidak mengungkap
							identitas Anda
						</li>
						<li>
							• Sistem akan mengecek apakah token ada di
							blockchain
						</li>
						<li>
							• Pilihan kandidat Anda tetap terenkripsi dan
							rahasia
						</li>
					</ul>
				</div>
			</div>
		</main>
	);
}
