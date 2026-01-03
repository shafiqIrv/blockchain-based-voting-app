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
	votesByMajor?: Record<string, Record<string, number>>;
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
							{electionStatus.status === "PENDING" ? "Pemilihan Belum Dimulai" : "Pemilihan Masih Berlangsung"}
						</h1>
						<p className="text-gray-400 mb-6">
							{electionStatus.status === "PENDING"
								? "Nantikan pembukaan periode voting sesuai jadwal di bawah ini."
								: "Hasil pemilihan akan tersedia setelah periode voting berakhir."}
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
						) : electionStatus?.status === "PENDING" ? (
							<div className="badge badge-info mb-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
								⏳ Belum Dimulai
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

				{/* ANALYTICS SECTION */}
				{(electionStatus?.status === "ENDED" || user?.role === "admin") && (
					<AnalyticsSection results={results} />
				)}

				{/* Verify CTA - Only for non-admin */}
				{user?.role !== "admin" && (
					<div className="glass-sm p-6 text-center animate-fadeIn stagger-4 mt-8">
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

function AnalyticsSection({ results }: { results: ElectionResults | null }) {
	const [stats, setStats] = useState<Record<string, { total: number; voted: number }>>({});
	const [selectedMajor, setSelectedMajor] = useState<string | null>(null);

	useEffect(() => {
		api.getElectionStats("election-2024").then(setStats).catch(console.error);
	}, []);

	// Participation Leaderboard Logic
	const participationData = Object.entries(stats).map(([major, data]) => ({
		major,
		...data,
		percentage: data.total > 0 ? (data.voted / data.total) * 100 : 0
	})).sort((a, b) => b.percentage - a.percentage);

	// Major Preference Logic
	// Use results.votesByMajor which is now available via getResults
	const majorVotes = results?.votesByMajor || {};
	const majors = Object.keys(majorVotes).sort();

	// Default to first major if none selected
	useEffect(() => {
		if (majors.length > 0 && !selectedMajor) {
			setSelectedMajor(majors[0]);
		}
	}, [majors, selectedMajor]);

	const currentMajorVotes = selectedMajor ? majorVotes[selectedMajor] : {};
	const totalMajorVotes = Object.values(currentMajorVotes).reduce((a: number, b: number) => a + b, 0);

	const sortedCandidates = results?.candidates.map(c => ({
		...c,
		majorVoteCount: currentMajorVotes[c.id] || 0
	})).sort((a, b) => b.majorVoteCount - a.majorVoteCount);

	return (
		<div className="space-y-8 animate-fadeIn stagger-4">
			<hr className="border-gray-800" />
			<h2 className="text-2xl font-bold text-center text-white mb-6">📊 Analitik Pemilihan</h2>

			<div className="grid md:grid-cols-2 gap-8">
				{/* Participation Leaderboard */}
				<div className="glass p-6">
					<h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
						<span>🏆</span> Partisipasi per Jurusan
					</h3>
					<div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
						{participationData.map((item, index) => (
							<div key={item.major} className="glass-sm p-4 relative overflow-hidden">
								{/* Progress Background */}
								<div
									className="absolute top-0 bottom-0 left-0 bg-blue-500/10 transition-all duration-1000"
									style={{ width: `${item.percentage}%` }}
								/>
								<div className="relative flex justify-between items-center z-10">
									<div>
										<p className="font-semibold text-white">
											{index + 1}. {item.major}
										</p>
										<p className="text-xs text-gray-400">
											{item.voted} dari {item.total} pemilih
										</p>
									</div>
									<div className="text-right">
										<p className="text-lg font-bold text-blue-400">
											{item.percentage.toFixed(1)}%
										</p>
									</div>
								</div>
							</div>
						))}
						{participationData.length === 0 && (
							<p className="text-gray-500 text-center py-4">Data tidak tersedia</p>
						)}
					</div>
				</div>

				{/* Major Preference */}
				<div className="glass p-6">
					<h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
						<span>📊</span> Pilihan Mayoritas
					</h3>

					{/* Dropdown */}
					<div className="mb-6">
						<label className="text-sm text-gray-400 mb-2 block">Pilih Jurusan</label>
						<select
							value={selectedMajor || ""}
							onChange={(e) => setSelectedMajor(e.target.value)}
							className="w-full bg-[#1a1a20] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
						>
							{majors.map(m => (
								<option key={m} value={m}>{m}</option>
							))}
						</select>
					</div>

					{/* Candidate List for Selected Major */}
					{selectedMajor && totalMajorVotes > 0 ? (
						<div className="space-y-4">
							{sortedCandidates?.map((candidate, idx) => {
								const pct = totalMajorVotes > 0 ? (candidate.majorVoteCount / totalMajorVotes) * 100 : 0;
								return (
									<div key={candidate.id} className="relative">
										<div className="flex items-center gap-3 mb-1">
											<div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}>
												{idx + 1}
											</div>
											<div className="flex-1">
												<span className="text-sm font-medium text-gray-200">{candidate.name}</span>
											</div>
											<div className="text-right">
												<span className="text-sm font-bold text-white">{pct.toFixed(1)}%</span>
											</div>
										</div>
										<div className="h-2 bg-gray-800 rounded-full overflow-hidden">
											<div
												className={`h-full rounded-full ${idx === 0 ? 'bg-yellow-500' : 'bg-gray-600'}`}
												style={{ width: `${pct}%` }}
											/>
										</div>
										<p className="text-xs text-gray-500 mt-1 text-right">{candidate.majorVoteCount} suara</p>
									</div>
								);
							})}
						</div>
					) : (
						<div className="text-center py-10 text-gray-500">
							<p>Pilih jurusan untuk melihat preferensi</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
