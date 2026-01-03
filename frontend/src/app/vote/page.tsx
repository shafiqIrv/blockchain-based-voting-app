"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, Candidate, ElectionStatus } from "@/lib/api";

export default function VotePage() {
	const { isAuthenticated, isLoading, user, tokenId, setAuthData } = useAuth();
	const router = useRouter();

	const [candidates, setCandidates] = useState<Candidate[]>([]);
	const [electionStatus, setElectionStatus] = useState<ElectionStatus | null>(
		null
	);
	const [selectedCandidate, setSelectedCandidate] = useState<string | null>(
		null
	);
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
			setCandidates(candidatesData.candidates);
			setHasVoted(voteStatusData.hasVoted);
		} catch (err: any) {
			setError(err.message || "Gagal memuat data");
		} finally {
			setIsLoadingData(false);
		}
	}

	async function handleSubmitVote() {
		if (!selectedCandidate) return;

		setIsSubmitting(true);
		setError(null);

		try {
			const result = await api.submitVote(selectedCandidate);
			setSuccess(true);
			setHasVoted(true);

			// Update auth context with new token
			const token = api.getToken();
			if (token && result.tokenIdentifier) {
				setAuthData(token, result.tokenIdentifier, user || undefined);
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
						Pilih satu kandidat untuk menyalurkan suara Anda
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
				<div className="grid md:grid-cols-3 gap-6 mb-10">
					{candidates.map((candidate, index) => (
						<div
							key={candidate.id}
							onClick={() => setSelectedCandidate(candidate.id)}
							className={`glass candidate-card p-6 cursor-pointer animate-fadeIn ${selectedCandidate === candidate.id
								? "selected"
								: ""
								}`}
							style={{ animationDelay: `${index * 0.1}s` }}
						>
							{/* Candidate Image Placeholder */}
							<div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-4 flex items-center justify-center">
								<span className="text-3xl text-white font-bold">
									{candidate.name.charAt(0)}
								</span>
							</div>

							<h3 className="text-xl font-semibold text-white text-center mb-3">
								{candidate.name}
							</h3>

							<p className="text-gray-400 text-sm text-center line-clamp-4">
								{candidate.vision}
							</p>

							{selectedCandidate === candidate.id && (
								<div className="mt-4 text-center">
									<span className="badge badge-success">
										✓ Dipilih
									</span>
								</div>
							)}
						</div>
					))}
				</div>

				{/* Submit Button */}
				<div className="text-center animate-fadeIn stagger-4">
					<button
						onClick={handleSubmitVote}
						disabled={!selectedCandidate || isSubmitting}
						className={`btn btn-primary text-lg px-10 py-4 ${!selectedCandidate
							? "opacity-50 cursor-not-allowed"
							: ""
							}`}
					>
						{isSubmitting ? (
							<>
								<div className="spinner w-5 h-5 border-2"></div>
								Mengirim Suara...
							</>
						) : (
							<>🗳️ Kirim Suara</>
						)}
					</button>

					{!selectedCandidate && (
						<p className="text-gray-500 text-sm mt-3">
							Pilih kandidat terlebih dahulu
						</p>
					)}
				</div>

				{/* Info */}
				<div className="max-w-2xl mx-auto mt-12">
					<div className="glass-sm p-6">
						<h4 className="text-white font-semibold mb-3">
							ℹ️ Informasi Penting
						</h4>
						<ul className="text-gray-400 text-sm space-y-2">
							<li>• Anda hanya dapat memilih satu kali</li>
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
