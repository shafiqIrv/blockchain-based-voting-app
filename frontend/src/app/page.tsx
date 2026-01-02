"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
	const { isAuthenticated, user, logout, isLoading } = useAuth();

	return (
		<main className="min-h-screen flex flex-col">
			{/* Header */}
			<header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f] border-b border-white/10">
				<div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center p-2 relative overflow-hidden">
							<Image
								src="/favicon.png"
								alt="Logo Pemira"
								fill
								className="object-contain"
								priority
							/>
						</div>
						<span className="text-xl font-bold text-white">
							ITB Voting
						</span>
					</div>

					<nav className="flex items-center gap-6">
						{isAuthenticated ? (
							<div className="flex items-center">
								{/* Group 1: Standard Links */}
								<div className="flex items-center gap-6">
									{user?.role === "admin" ? (
										<>
											<Link
												href="/results"
												className="text-gray-300 hover:text-white transition"
											>
												Results
											</Link>
											<div className="h-6 w-px bg-white/20 mx-2"></div>
											<Link
												href="/admin"
												className="text-indigo-400 hover:text-indigo-300 font-medium transition"
											>
												Admin
											</Link>
										</>
									) : (
										<>
											<Link
												href="/vote"
												className="text-gray-300 hover:text-white transition"
											>
												Vote
											</Link>
											<Link
												href="/verify"
												className="text-gray-300 hover:text-white transition"
											>
												Verify
											</Link>
											<Link
												href="/results"
												className="text-gray-300 hover:text-white transition"
											>
												Results
											</Link>
										</>
									)}
								</div>

								{/* Admin Link logic moved above, removing this redundant block */}

								{/* Divider */}
								<div className="h-6 w-px bg-white/20 mx-6"></div>

								{/* Group 2: Profile & Logout */}
								<div className="flex items-center gap-6">
									<div className="flex items-center gap-3">
										<div className="text-right hidden sm:block leading-tight">
											<div className="text-sm font-medium text-white">
												{user?.name}
											</div>
											<div className="text-xs text-gray-400">
												{user?.role === "admin"
													? "Administrator"
													: "Voter"}
											</div>
										</div>
										<div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shadow-lg shadow-indigo-500/20">
											{user?.name?.charAt(0) || "U"}
										</div>
									</div>

									<button
										onClick={logout}
										className="text-gray-400 hover:text-white transition"
										title="Logout"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
											<polyline points="16 17 21 12 16 7" />
											<line x1="21" x2="9" y1="12" y2="12" />
										</svg>
									</button>
								</div>
							</div>
						) : (
							<Link href="/login" className="btn btn-primary">
								Login to Vote
							</Link>
						)}
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<section className="flex-1 flex items-center justify-center px-6 pt-32">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-sm mb-8 animate-fadeIn">
						<span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
						<span className="text-sm text-gray-300">
							Powered by Hyperledger Fabric
						</span>
					</div>

					{user?.role === "admin" ? (
						<>
							<h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fadeIn stagger-1">
								Administrator
								<span className="block text-gradient">
									Dashboard
								</span>
							</h1>

							<p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto animate-fadeIn stagger-2">
								Pantau jalannya pemilihan, kelola konfigurasi, dan lihat status pemilih secara real-time.
							</p>

							<div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn stagger-3">
								<Link
									href="/admin"
									className="btn btn-primary text-lg px-8 py-4"
								>
									⚙️ Kelola Pemilihan
								</Link>
								<Link
									href="/results"
									className="btn btn-secondary text-lg px-8 py-4"
								>
									📊 Pantau Hasil
								</Link>
							</div>
						</>
					) : (
						<>
							<h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fadeIn stagger-1">
								Secure & Transparent
								<span className="block text-gradient">
									Blockchain Voting
								</span>
							</h1>

							<p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto animate-fadeIn stagger-2">
								Sistem pemilihan berbasis blockchain untuk mahasiswa
								ITB. Suara Anda terjamin aman, rahasia, dan dapat
								diverifikasi.
							</p>

							<div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn stagger-3">
								{isLoading ? (
									<div className="flex items-center justify-center gap-3">
										<div className="spinner"></div>
										<span className="text-gray-400">
											Loading...
										</span>
									</div>
								) : isAuthenticated ? (
									<>
										<Link
											href="/vote"
											className="btn btn-primary text-lg px-8 py-4"
										>
											🗳️ Mulai Voting
										</Link>
										<Link
											href="/verify"
											className="btn btn-secondary text-lg px-8 py-4"
										>
											🔍 Verifikasi Suara
										</Link>
									</>
								) : (
									<Link
										href="/login"
										className="btn btn-primary text-lg px-8 py-4"
									>
										Login to Vote
									</Link>
								)}
							</div>
						</>
					)}
				</div>
			</section>

			{/* Features Section */}
			<section className="py-20 px-6">
				<div className="max-w-6xl mx-auto">
					<h2 className="text-3xl font-bold text-center text-white mb-12">
						Mengapa Blockchain Voting?
					</h2>

					<div className="grid md:grid-cols-3 gap-6">
						{[
							{
								icon: "🔒",
								title: "Aman & Terenkripsi",
								description:
									"Suara dienkripsi dan disimpan di blockchain yang tidak dapat dimanipulasi",
							},
							{
								icon: "👁️",
								title: "Transparan",
								description:
									"Setiap suara dapat diverifikasi tanpa mengungkap identitas pemilih",
							},
							{
								icon: "⚡",
								title: "Real-time",
								description:
									"Hasil pemilihan dihitung secara otomatis setelah periode voting berakhir",
							},
						].map((feature, index) => (
							<div
								key={index}
								className="glass glass-hover p-8 animate-fadeIn"
								style={{ animationDelay: `${index * 0.1}s` }}
							>
								<div className="text-4xl mb-4">
									{feature.icon}
								</div>
								<h3 className="text-xl font-semibold text-white mb-3">
									{feature.title}
								</h3>
								<p className="text-gray-400">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-8 px-6 border-t border-gray-800">
				<div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
					<div className="text-gray-500 text-sm">
						© 2024 ITB Voting System. Powered by Hyperledger Fabric.
					</div>
					<div className="flex items-center gap-6 text-sm text-gray-500">
						<span>Institut Teknologi Bandung</span>
					</div>
				</div>
			</footer>
		</main>
	);
}
