"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Candidate, ElectionStatus, IRVResult } from "@/lib/api";
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

	// Lift up IRV state
	const [irvData, setIrvData] = useState<IRVResult | null>(null);

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

				// Fetch IRV data if results available (or if admin)
				if (status.status === "ENDED" || user?.role === 'admin') {
					api.getElectionIRV("election-2024").then(setIrvData).catch(console.error);
				}

			} catch (e: any) {
				// Normalize error message
				const msg = e.message || "";

				// Check if it's the specific "not available" error
				if (msg.includes("not available")) {
					// This is expected when election is active (even for admins if backend enforces it)
					setError(null);
				} else if (status.status !== "ENDED" && user?.role !== 'admin') {
					// Standard voter logic: expect failure if not ended
					setError(null);
				} else {
					// Real unexpected error
					throw e;
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

	// Election not ended and no results available
	// Display waiting screen if: Not Ended AND No Results (regardless of role)
	if (electionStatus && electionStatus.status !== "ENDED" && !results) {
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
								{new Date(electionStatus.endTime).toLocaleString("id-ID", {
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
	const totalVotes = results?.totalVotes || 0; // Keep original total for FPTP display

	// Determine Winner Logic (IRV Priority)
	let winner = results?.candidates[0]; // Default to FPTP winner
	let winnerVoteCount = winner?.voteCount || 0;
	let winnerPercentage = 0;
	let finalRoundTotal = totalVotes; // Might change in IRV

	// If IRV data exists and has a winner
	if (irvData && irvData.winnerId && irvData.rounds.length > 0) {
		const trueWinnerId = irvData.winnerId;
		const finalRound = irvData.rounds[irvData.rounds.length - 1];
		const winnerInFinal = finalRound.candidates.find(c => c.id === trueWinnerId);

		if (winnerInFinal) {
			// Find candidate object for name/image
			const candidateObj = results?.candidates.find(c => c.id === trueWinnerId);
			if (candidateObj) {
				winner = candidateObj;
				winnerVoteCount = winnerInFinal.voteCount;
				finalRoundTotal = finalRound.candidates.reduce((a, b) => a + b.voteCount, 0); // Active votes only
			}
		}
	}

	if (winner) {
		winnerPercentage = finalRoundTotal > 0 ? (winnerVoteCount / finalRoundTotal) * 100 : 0;
	}

	return (
		<main className="min-h-screen py-24 px-6">
			<div className="max-w-4xl mx-auto">
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
								Pemenang {irvData?.winnerId ? "(IRV Final)" : ""}
							</h2>
							<h3 className="text-3xl font-bold text-white mb-2">
								{winner.name}
							</h3>
							<p className="text-2xl text-gradient font-bold mb-4">
								{winnerVoteCount} suara (
								{winnerPercentage.toFixed(1)}%)
							</p>
							{irvData?.winnerId && (
								<p className="text-xs text-gray-500 mt-2">
									*Memenangkan &gt;50% suara pada putaran {irvData.rounds.length}
								</p>
							)}
						</div>
					</div>
				)}

				{/* IRV SECTION */}
				{(electionStatus?.status === "ENDED" || user?.role === "admin") && (
					<IRVSection results={results} irvData={irvData} />
				)}



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

// Hardcoded map from Oracle data
const MAJOR_TO_PREFIX: Record<string, string> = {
	"Matematika": "101", "Fisika": "102", "Astronomi": "103", "Kimia": "105", "Aktuaria": "108", "TPB FMIPA": "160",
	"Mikrobiologi": "104", "Biologi": "106", "TPB SITH-S": "161",
	"Rekayasa Hayati": "112", "Rekayasa Pertanian": "114", "Rekayasa Kehutanan": "115", "Teknologi Pasca Panen": "119", "TPB SITH-R": "198",
	"Sains dan Teknologi Farmasi": "107", "Farmasi Klinik dan Komunitas": "116", "TPB SF": "162",
	"Teknik Pertambangan": "121", "Teknik Perminyakan": "122", "Teknik Geofisika": "123", "Teknik Metalurgi": "125", "TPB FTTM": "164",
	"Teknik Geologi": "120", "Meteorologi": "128", "Oseanografi": "129", "Teknik Geodesi dan Geomatika": "151", "TPB FITB": "163",
	"Teknik Kimia": "130", "Teknik Fisika": "133", "Teknik Industri": "134", "Teknik Pangan": "143", "Manajemen Rekayasa": "144", "Teknik Bioenergi dan Kemurgi": "145", "Teknik Industri Cirebon": "194", "TPB FTI": "167",
	"Teknik Elektro": "132", "Teknik Tenaga Listrik": "180", "Teknik Telekomunikasi": "181", "Teknik Biomedis": "183", "TPB STEI-R": "165",
	"Teknik Informatika": "135", "Sistem dan Teknologi Informasi": "182", "TPB STEI-K": "196",
	"Teknik Mesin": "131", "Teknik Dirgantara": "136", "Teknik Material": "137", "TPB FTMD": "169",
	"Teknik Sipil": "150", "Teknik Lingkungan": "153", "Teknik Kelautan": "155", "Rekayasa Infrastruktur Lingkungan": "157", "Teknik dan Pengelolaan Sumber Daya Air": "158", "TPB FTSL": "166",
	"Arsitektur": "152", "Perencanaan Wilayah dan Kota": "154", "Perencanaan Wilayah dan Kota Cirebon": "156", "TPB SAPPK": "199",
	"Seni Rupa": "170", "Kriya Cirebon": "171", "Kriya": "172", "Desain Interior": "173", "Desain Komunikasi Visual": "174", "Desain Produk": "175", "TPB FSRD": "168",
	"Manajemen": "190", "Kewirausahaan": "192", "TPB SBM": "197"
};


function AnalyticsSection({ results }: { results: ElectionResults | null }) {
	const [stats, setStats] = useState<Record<string, { total: number; voted: number }>>({});
	const [selectedMajor, setSelectedMajor] = useState<string | null>(null);

	useEffect(() => {
		api.getElectionStats("election-2024").then(setStats).catch(console.error);
	}, []);

	// Participation Leaderboard Logic
	const participationData = Object.entries(stats).map(([major, data]) => ({
		major,
		prefix: MAJOR_TO_PREFIX[major] || "?",
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
											{index + 1}. {item.major} ({item.prefix})
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
								<option key={m} value={m}>{m} ({MAJOR_TO_PREFIX[m] || "?"})</option>
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

function IRVSection({ results, irvData }: { results: ElectionResults | null, irvData: IRVResult | null }) {
	if (!irvData) return null;

	return (
		<div className="space-y-8 pb-6 animate-fadeIn stagger-5">
			<hr className="border-gray-800" />
			<div className="group">
				<h2 className="text-2xl font-bold text-center text-white mb-2 flex items-center justify-center gap-2">
					🧮 Perhitungan Detail (IRV)
				</h2>
				<p className="text-center text-gray-400 text-sm group-hover:text-gray-300">Alur eliminasi dan transfer suara</p>
			</div>

			<div className="grid gap-6 animate-fadeIn">
				{irvData.rounds.map((round) => (
					<div key={round.roundNumber} className="glass p-6 relative overflow-hidden">
						<div className="absolute top-0 right-0 p-4 opacity-10 text-6xl font-black text-white">
							{round.roundNumber}
						</div>
						<div className="flex justify-between items-center mb-6 relative z-10">
							<h3 className="text-xl font-bold text-white flex items-center gap-2">
								<span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">{round.roundNumber}</span>
								Putaran {round.roundNumber}
							</h3>
							{round.eliminatedId && (
								<span className="badge badge-error gap-2">
									❌ Eliminasi: {results?.candidates.find(c => c.id === round.eliminatedId)?.name}
								</span>
							)}
						</div>
						{/* List candidates and votes */}
						<div className="space-y-3 relative z-10">
							{round.candidates.map((c, idx) => {
								const candidateName = results?.candidates.find(cand => cand.id === c.id)?.name || c.id;
								const isEliminated = c.id === round.eliminatedId;
								const totalVotes = round.candidates.reduce((a, b) => a + b.voteCount, 0);
								const pct = (c.voteCount / totalVotes) * 100;

								return (
									<div key={c.id} className={`relative p-3 rounded-lg overflow-hidden transition-all ${idx === 0 ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-white/5'} ${isEliminated ? 'opacity-50 grayscale border border-red-500/30' : ''}`}>
										{/* Bar BG */}
										<div className="absolute top-0 left-0 bottom-0 bg-white/5 transition-all duration-500" style={{ width: `${pct}%` }}></div>

										<div className="relative flex justify-between items-center">
											<div className="flex items-center gap-3">
												<span className="font-mono text-xs text-gray-500 w-6">#{idx + 1}</span>
												<span className="text-white font-medium">{candidateName}</span>
											</div>
											<div className="text-right">
												<span className="text-white font-bold block">{c.voteCount}</span>
												<span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
											</div>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				))}

			</div>
		</div>
	);
}
