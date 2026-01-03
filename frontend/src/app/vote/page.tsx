"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, Candidate, ElectionStatus } from "@/lib/api";

export default function VotePage() {
	const { isAuthenticated, isLoading, user, tokenId, signature, setAuthData } = useAuth();
	const router = useRouter();


	const [electionStatus, setElectionStatus] = useState<ElectionStatus | null>(
		null
	);
	const [candidates, setCandidates] = useState<Candidate[]>([]);
	// Stores the ordered list of candidate IDs
	const [rankedCandidateIds, setRankedCandidateIds] = useState<string[]>([]);

	// Original candidates map for easy lookup
	const [candidatesMap, setCandidatesMap] = useState<Record<string, Candidate>>({});
	const [hasVoted, setHasVoted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.push("/login");
		}
	}, [isAuthenticated, isLoading, router]);

	useEffect(() => {
		if (isAuthenticated) {
			loadVotingData();
		}
	}, [isAuthenticated]);

	async function loadVotingData() {
		try {
			setIsLoadingData(true);

			const [statusData, candidatesData, voteStatusData] =
				await Promise.all([
					api.getElectionStatus("election-2024"),
					api.getCandidates("election-2024"),
					api.getVoteStatus(),
				]);

			setElectionStatus(statusData);
			setElectionStatus(statusData);
			setCandidates(candidatesData.candidates);

			// Initialize ranking with default order (or random/shuffled if preferred)
			setRankedCandidateIds(candidatesData.candidates.map(c => c.id));

			const map: Record<string, Candidate> = {};
			candidatesData.candidates.forEach(c => { map[c.id] = c; });
			setCandidatesMap(map);

			// Check if user has voted (either via account or anonymous token)
			let alreadyVoted = voteStatusData.hasVoted;

			// If account hasn't voted, check the anonymous token if we have one
			if (!alreadyVoted && tokenId) {
				try {
					const verification = await api.verifyVote(tokenId);
					if (verification.found) {
						alreadyVoted = true;
					}
				} catch (e) {
					console.log("Token verification check failed or token not yet used");
				}
			}

			setHasVoted(alreadyVoted);
		} catch (err: any) {
			setError(err.message || "Gagal memuat data");
		} finally {
			setIsLoadingData(false);
		}
	}

	async function handleSubmitVote() {
		if (rankedCandidateIds.length === 0) return;

		setIsSubmitting(true);
		setError(null);

		try {
			// Use the blind token and signature for anonymous voting
			if (!tokenId || !signature) {
				throw new Error("Token pemilihan tidak ditemukan. Silakan login ulang.");
			}

			const result = await api.submitVote(rankedCandidateIds, tokenId, signature);
			setSuccess(true);
			setHasVoted(true);

			// Update auth context with new token (if changed)
			if (result.tokenIdentifier) {
				// For anonymous voting, the result token should match our blind token
				// We don't really need to setAuthData here as we already have the token
				// But we can ensure it's synced if needed.
				// Actually, let's just leave it or remove it since we manage identity via file/localStorage now.
			}
		} catch (err: any) {
			setError(err.message || "Gagal mengirim suara");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isLoading || isLoadingData) {
		return (
			<main className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="spinner mx-auto mb-4"></div>
					<p className="text-gray-400">Memuat data pemilihan...</p>
				</div>
			</main>
		);
	}

	if (success) {
		return (
			<main className="min-h-screen flex items-center justify-center px-6">
				<div className="glass p-10 max-w-lg w-full text-center animate-fadeIn">
					<div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
						<span className="text-4xl">✓</span>
					</div>
					<h1 className="text-3xl font-bold text-white mb-4">
						Suara Berhasil Dicatat!
					</h1>
					<p className="text-gray-400 mb-6">
						Suara Anda telah tersimpan di blockchain dengan aman.
					</p>
					<div className="glass-sm p-4 mb-6">
						<p className="text-sm text-gray-500 mb-1">
							Token Verifikasi Anda:
						</p>
						<p className="font-mono text-sm text-indigo-400 break-all">
							{tokenId}
						</p>
					</div>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Link href="/verify" className="btn btn-primary">
							🔍 Verifikasi Suara
						</Link>
						<Link href="/" className="btn btn-secondary">
							Kembali ke Beranda
						</Link>
					</div>
				</div>
			</main>
		);
	}

	if (hasVoted) {
		return (
			<main className="min-h-screen flex items-center justify-center px-6">
				<div className="glass p-10 max-w-lg w-full text-center animate-fadeIn">
					<div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
						<span className="text-4xl">🗳️</span>
					</div>
					<h1 className="text-3xl font-bold text-white mb-4">
						Anda Sudah Memilih
					</h1>
					<p className="text-gray-400 mb-6">
						Suara Anda sudah tercatat di blockchain. Anda dapat
						memverifikasi suara Anda.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Link href="/verify" className="btn btn-primary">
							🔍 Verifikasi Suara
						</Link>
						<Link href="/results" className="btn btn-secondary">
							📊 Lihat Hasil
						</Link>
					</div>
				</div>
			</main>
		);
	}

	// Block Admin
	if (user?.role === "admin") {
		return (
			<main className="min-h-screen flex items-center justify-center px-6">
				<div className="glass p-10 max-w-lg w-full text-center animate-fadeIn">
					<div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
						<span className="text-4xl">🛡️</span>
					</div>
					<h1 className="text-3xl font-bold text-white mb-4">
						Akses Administrator
					</h1>
					<p className="text-gray-400 mb-6">
						Sebagai administrator, Anda tidak memiliki hak suara dalam pemilihan ini untuk menjaga netralitas.
						Namun, Anda dapat memantau jalannya pemilihan.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Link href="/admin" className="btn btn-primary">
							⚙️ Dashboard Admin
						</Link>
						<Link href="/results" className="btn btn-secondary">
							📊 Pantau Hasil
						</Link>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen py-24 px-6">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12 animate-fadeIn">
					<div className="badge badge-primary mb-4">
						{electionStatus?.status === "ACTIVE"
							? "🟢 Voting Aktif"
							: "⏳ " + electionStatus?.status}
					</div>
					<h1 className="text-4xl font-bold text-white mb-4">
						{electionStatus?.name || "Pemilihan"}
					</h1>
					<p className="text-gray-400">
						Urutkan kandidat berdasarkan preferensi Anda (No. 1 adalah pilihan utama)
					</p>
				</div>

				{/* Error Message */}
				{error && (
					<div className="max-w-2xl mx-auto mb-8">
						<div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
							<p className="text-red-400 text-center">{error}</p>
						</div>
					</div>
				)}

				{/* Candidate Grid */}
				{/* Ranking Grid */}
				<div className="mb-10">
					<div className="glass p-6 rounded-2xl border border-white/10 bg-white/5">
						<h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
							🏆 Urutkan Pilihan Anda
						</h3>
						<p className="text-gray-400 mb-6 text-sm">
							Gunakan tombol panah untuk mengurutkan kandidat dari yang paling Anda inginkan (atas) hingga yang paling kurang Anda inginkan (bawah).
						</p>

						<div className="space-y-4">
							{rankedCandidateIds.map((candidateId, index) => {
								const candidate = candidatesMap[candidateId];
								if (!candidate) return null;

								const isFirst = index === 0;
								const isLast = index === rankedCandidateIds.length - 1;

								const moveUp = () => {
									if (isFirst) return;
									const newRank = [...rankedCandidateIds];
									[newRank[index - 1], newRank[index]] = [newRank[index], newRank[index - 1]];
									setRankedCandidateIds(newRank);
								};

								const moveDown = () => {
									if (isLast) return;
									const newRank = [...rankedCandidateIds];
									[newRank[index + 1], newRank[index]] = [newRank[index], newRank[index + 1]];
									setRankedCandidateIds(newRank);
								};

								return (
									<div
										key={candidate.id}
										className={`relative flex items-center gap-4 p-4 rounded-xl transition-all border ${index === 0
											? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/20'
											: 'bg-black/20 border-white/5 hover:border-white/10'
											}`}
									>
										{/* Rank Number */}
										<div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${index === 0 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
											}`}>
											#{index + 1}
										</div>

										{/* Avatar */}
										<div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
											<span className="text-lg text-white font-bold">{candidate.name.charAt(0)}</span>
										</div>

										{/* Content */}
										<div className="flex-1 min-w-0">
											<h4 className="text-lg font-bold text-white truncate">{candidate.name}</h4>
											<p className="text-gray-400 text-sm truncate">{candidate.vision}</p>
										</div>

										{/* Actions */}
										<div className="flex flex-col gap-1">
											<button
												onClick={moveUp}
												disabled={isFirst}
												className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition"
												title="Geser ke Atas"
											>
												▲
											</button>
											<button
												onClick={moveDown}
												disabled={isLast}
												className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition"
												title="Geser ke Bawah"
											>
												▼
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Submit Button */}
				<div className="text-center animate-fadeIn stagger-4">
					<button
						onClick={handleSubmitVote}
						disabled={isSubmitting}
						className="btn btn-primary text-lg px-10 py-4 w-full md:w-auto"
					>
						{isSubmitting ? (
							<>
								<div className="spinner w-5 h-5 border-2"></div>
								Mengirim Pilihan...
							</>
						) : (
							<>🗳️ Kirim Pilihan Berurutan</>
						)}
					</button>


				</div>

				{/* Info */}
				<div className="max-w-2xl mx-auto mt-12">
					<div className="glass-sm p-6">
						<h4 className="text-white font-semibold mb-3">
							ℹ️ Informasi Penting
						</h4>
						<ul className="text-gray-400 text-sm space-y-2">
							<li>• Urutkan kandidat sesuai preferensi Anda.</li>
							<li>• Kandidat di posisi #1 adalah pilihan utama Anda.</li>
							<li>• Suara Anda menggunakan metode Ranked Choice Voting.</li>
							<li>
								• Suara Anda akan dienkripsi dan disimpan di
								blockchain
							</li>
							<li>
								• Setelah voting, Anda akan menerima token untuk
								verifikasi
							</li>
							<li>
								• Hasil voting akan tersedia setelah periode
								pemilihan berakhir
							</li>
						</ul>
					</div>
				</div>
			</div>
		</main>
	);
}
