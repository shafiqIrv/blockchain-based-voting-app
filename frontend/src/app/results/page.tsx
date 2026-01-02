"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Candidate, ElectionStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface ElectionResults {
	electionId: string;
	name: string;
	totalVotes: number;
	candidates: Candidate[];
	endedAt: string;
}

export default function ResultsPage() {
	const { user } = useAuth();
	const [results, setResults] = useState<ElectionResults | null>(null);
	const [electionStatus, setElectionStatus] = useState<ElectionStatus | null>(
		null
	);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadResults();
	}, []);

	async function loadResults() {
		try {
			setIsLoading(true);

			// First get election status
			const status = await api.getElectionStatus("election-2024");
			setElectionStatus(status);

			// Try to get results (will fail if election not ended)
			try {
				const resultsData = await api.getResults("election-2024");
				setResults(resultsData);
			} catch (e: any) {
				// Allow admin to bypass UI check, but if API fails, still show partial or handle it.
				// However, the API logic for admin now returns results even if not ended.
				// So if I am admin, getResults should SUCCEED.
				// If I am NOT admin, it throws "not ended".

				if (status.status !== "ENDED" && user?.role !== 'admin') {
					// Expected - election not ended and not admin
					setError(null);
				} else {
					// Actual error or Admin failed to fetch
					if (e.message && e.message.includes("not available") && user?.role === 'admin') {
						// Should not happen if API is updated
						setError(e.message);
					} else if (e.message && e.message.includes("not available")) {
						setError(null);
					} else {
						throw e;
					}
				}
			}
		} catch (err: any) {
			setError(err.message || "Gagal memuat hasil");
		} finally {
			setIsLoading(false);
		}
	}

	if (isLoading) {
		return (
			<main className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="spinner mx-auto mb-4"></div>
					<p className="text-gray-400">Memuat hasil...</p>
				</div>
			</main>
		);
	}

	// Election not ended and NOT admin
	// Display waiting screen only if: Not Ended AND No Results AND (User is NOT Admin OR Admin failed to get results)
	if (electionStatus && electionStatus.status !== "ENDED" && !results && user?.role !== "admin") {
		return (
			<main className="min-h-screen py-24 px-6">
				<div className="max-w-2xl mx-auto text-center">
					<Link href="/" className="inline-block mb-6">
						<span className="text-gray-400 hover:text-white transition">
							← Kembali
						</span>
					</Link>

					<div className="glass p-10 animate-fadeIn">
						<div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
							<span className="text-4xl">⏳</span>
						</div>
						<h1 className="text-3xl font-bold text-white mb-4">
							Pemilihan Masih Berlangsung
						</h1>
						<p className="text-gray-400 mb-6">
							Hasil pemilihan akan tersedia setelah periode voting
							berakhir.
						</p>

						<div className="glass-sm p-4 mb-6">
							<p className="text-sm text-gray-500 mb-1">
								Berakhir pada:
							</p>
							<p className="text-lg text-white">
								{new Date(
									electionStatus.endTime
								).toLocaleString("id-ID", {
									dateStyle: "full",
									timeStyle: "short",
								})}
							</p>
						</div>

						<div className="flex justify-center gap-3">
							<Link href="/vote" className="btn btn-primary">
								🗳️ Vote Sekarang
							</Link>
							<Link href="/verify" className="btn btn-secondary">
								🔍 Verifikasi
							</Link>
						</div>
					</div>
				</div>
			</main>
		);
	}

	// Error state
	if (error) {
		return (
			<main className="min-h-screen py-24 px-6">
				<div className="max-w-2xl mx-auto text-center">
					<div className="glass p-10">
						<div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
							<span className="text-4xl">❌</span>
						</div>
						<h1 className="text-2xl font-bold text-white mb-4">
							Terjadi Kesalahan
						</h1>
						<p className="text-gray-400 mb-6">{error}</p>
						<button
							onClick={loadResults}
							className="btn btn-primary"
						>
							Coba Lagi
						</button>
					</div>
				</div>
			</main>
		);
	}

	// Results available
	const winner = results?.candidates[0];
	const totalVotes = results?.totalVotes || 0;

	return (
		<main className="min-h-screen py-24 px-6">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				{/* Header */}
				<div className="mb-12 animate-fadeIn">
					<div className="flex justify-between items-start mb-6">
						<Link href="/">
							<span className="text-gray-400 hover:text-white transition flex items-center gap-2">
								← Kembali
							</span>
						</Link>
					</div>

					<div className="text-center">
						{electionStatus?.status === "ENDED" ? (
							<div className="badge badge-success mb-4">
								✓ Pemilihan Selesai
							</div>
						) : (
							<div className="badge badge-warning mb-4">
								⏳ Sedang Berjalan
							</div>
						)}
						<h1 className="text-4xl font-bold text-white mb-4">
							📊 Hasil Pemilihan
						</h1>
						<p className="text-gray-400">{results?.name}</p>
					</div>
				</div>

				{/* Winner Card */}
				{winner && (
					<div className="glass p-8 mb-8 text-center animate-fadeIn stagger-1 relative overflow-hidden">
						<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"></div>
						<div className="relative">
							<span className="text-5xl mb-4 block">🏆</span>
							<h2 className="text-sm text-indigo-400 uppercase tracking-wider mb-2">
								Pemenang
							</h2>
							<h3 className="text-3xl font-bold text-white mb-2">
								{winner.name}
							</h3>
							<p className="text-2xl text-gradient font-bold mb-4">
								{winner.voteCount} suara (
								{totalVotes > 0
									? (
										(winner.voteCount! / totalVotes) *
										100
									).toFixed(1)
									: 0}
								%)
							</p>
						</div>
					</div>
				)}

				{/* All Results */}
				<div className="space-y-4 mb-8">
					{results?.candidates.map((candidate, index) => {
						const percentage =
							totalVotes > 0
								? (candidate.voteCount! / totalVotes) * 100
								: 0;

						return (
							<div
								key={candidate.id}
								className="glass p-6 animate-fadeIn"
								style={{
									animationDelay: `${(index + 1) * 0.1}s`,
								}}
							>
								<div className="flex items-center gap-4 mb-4">
									<div
										className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${index === 0
											? "bg-gradient-to-br from-yellow-400 to-orange-500"
											: index === 1
												? "bg-gradient-to-br from-gray-300 to-gray-400"
												: index === 2
													? "bg-gradient-to-br from-amber-600 to-amber-700"
													: "bg-gray-600"
											}`}
									>
										{index + 1}
									</div>
									<div className="flex-1">
										<h3 className="text-lg font-semibold text-white">
											{candidate.name}
										</h3>
										<p className="text-sm text-gray-400">
											{candidate.voteCount} suara
										</p>
									</div>
									<div className="text-right">
										<span className="text-2xl font-bold text-white">
											{percentage.toFixed(1)}%
										</span>
									</div>
								</div>

								{/* Progress Bar */}
								<div className="h-3 bg-gray-800 rounded-full overflow-hidden">
									<div
										className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
										style={{ width: `${percentage}%` }}
									></div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Stats */}
				<div className="grid md:grid-cols-3 gap-4 mb-8">
					<div className="glass-sm p-6 text-center animate-fadeIn stagger-3">
						<p className="text-3xl font-bold text-white mb-1">
							{totalVotes}
						</p>
						<p className="text-sm text-gray-400">Total Suara</p>
					</div>
					<div className="glass-sm p-6 text-center animate-fadeIn stagger-3">
						<p className="text-3xl font-bold text-white mb-1">
							{results?.candidates.length}
						</p>
						<p className="text-sm text-gray-400">Kandidat</p>
					</div>
					<div className="glass-sm p-6 text-center animate-fadeIn stagger-3">
						<p className="text-lg font-bold text-white mb-1">
							{results?.endedAt
								? new Date(results.endedAt).toLocaleDateString(
									"id-ID"
								)
								: "-"}
						</p>
						<p className="text-sm text-gray-400">Tanggal Selesai</p>
					</div>
				</div>

				{/* Verify CTA - Only for non-admin */}
				{user?.role !== "admin" && (
					<div className="glass-sm p-6 text-center animate-fadeIn stagger-4">
						<p className="text-gray-400 mb-4">
							Ingin memverifikasi bahwa suara Anda tercatat dengan
							benar?
						</p>
						<Link href="/verify" className="btn btn-secondary">
							🔍 Verifikasi Suara Saya
						</Link>
					</div>
				)}
			</div>
		</main>
	);
}
