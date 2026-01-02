"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
	const { isAuthenticated, user, logout, isLoading } = useAuth();

	return (
		<main className="min-h-screen flex flex-col">
			{/* Header */}
			<header className="fixed top-0 left-0 right-0 z-50 glass-sm">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
							<span className="text-white font-bold text-lg">
								🗳️
							</span>
						</div>
						<span className="text-xl font-bold text-white">
							ITB Voting
						</span>
					</div>

					<nav className="flex items-center gap-6">
						{isAuthenticated ? (
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
								<div className="flex items-center gap-3 pl-4 border-l border-gray-700">
									<span className="text-sm text-gray-400">
										{user?.name}
									</span>
									<div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
										{user?.name?.charAt(0) || "U"}
									</div>
								</div>
								<button
									onClick={logout}
									className="text-red-400 hover:text-red-300 transition text-sm font-medium"
								>
									Logout
								</button>
							</>
						) : (
							<Link href="/login" className="btn btn-primary">
								Login to Vote
							</Link>
						)}
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<section className="flex-1 flex items-center justify-center px-6 pt-24">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-sm mb-8 animate-fadeIn">
						<span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
						<span className="text-sm text-gray-300">
							Powered by Hyperledger Fabric
						</span>
					</div>

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
