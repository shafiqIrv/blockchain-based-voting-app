"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Election, Voter } from "@/lib/api";

export default function AdminPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();
    const [election, setElection] = useState<Election | null>(null);
    const [activeTab, setActiveTab] = useState<"config" | "voters">("config");

    // Config State
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Voters State
    const [voters, setVoters] = useState<Voter[]>([]);
    const [isLoadingVoters, setIsLoadingVoters] = useState(false);

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
            router.push("/");
        }
    }, [isLoading, isAuthenticated, user, router]);

    useEffect(() => {
        if (isAuthenticated && user?.role === "admin") {
            loadData();
        }
    }, [isAuthenticated, user]);

    const loadData = async () => {
        try {
            const data = await api.getCurrentElection();
            setElection(data);
            setStartDate(new Date(data.startTime).toISOString().slice(0, 16));
            setEndDate(new Date(data.endTime).toISOString().slice(0, 16));

            loadVoters(data.id);
        } catch (e) {
            console.error("Failed to load election");
        }
    };

    const loadVoters = async (electionId: string) => {
        setIsLoadingVoters(true);
        try {
            const data = await api.getVoters(electionId);
            setVoters(data.filter((v) => v.role !== "admin"));
        } catch (e) {
            console.error("Failed to load voters");
        } finally {
            setIsLoadingVoters(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!election) return;

        setIsSubmitting(true);
        setError("");
        setSuccess("");

        try {
            await api.updateElectionDates(election.id, startDate, endDate);
            setSuccess("Election dates updated successfully!");
        } catch (err: any) {
            setError(err.message || "Failed to update election");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || !isAuthenticated || user?.role !== "admin") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen px-6 py-32 bg-[#0a0a0f]">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab("config")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === "config" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                }`}
                        >
                            ⚙️ Konfigurasi
                        </button>
                        <button
                            onClick={() => setActiveTab("voters")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === "voters" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                }`}
                        >
                            👥 Status Pemilih
                        </button>
                    </div>
                </div>

                {activeTab === "config" ? (
                    /* Election Control Card */
                    <div className="glass p-8 rounded-2xl border border-white/10 bg-white/5 animate-fadeIn">
                        <h2 className="text-xl font-semibold text-white mb-6">Konfigurasi Pemilihan</h2>

                        {election && (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Waktu Mulai
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Waktu Selesai
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                                        <p className="text-green-400 text-sm">{success}</p>
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="btn btn-primary px-8 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                ) : (
                    /* Voters List */
                    <div className="glass rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-fadeIn">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h2 className="text-xl font-semibold text-white">Daftar Pemilih ({voters.length})</h2>
                            <div className="flex gap-4 text-sm">
                                <span className="flex items-center gap-2 text-green-400">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Sudah Memilih: {voters.filter(v => v.hasVoted).length}
                                </span>
                                <span className="flex items-center gap-2 text-gray-400">
                                    <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                    Belum Memilih: {voters.filter(v => !v.hasVoted).length}
                                </span>
                            </div>
                        </div>

                        {isLoadingVoters ? (
                            <div className="p-12 text-center">
                                <div className="spinner mx-auto mb-4"></div>
                                <p className="text-gray-400">Memuat data pemilih...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 text-gray-400 text-sm uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">NIM</th>
                                            <th className="px-6 py-4 font-medium">Nama</th>
                                            <th className="px-6 py-4 font-medium">Fakultas</th>
                                            <th className="px-6 py-4 font-medium">Peran</th>
                                            <th className="px-6 py-4 font-medium text-center">Status Voting</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {voters.map((voter) => (
                                            <tr key={voter.nim} className="hover:bg-white/5 transition">
                                                <td className="px-6 py-4 font-mono text-indigo-300">{voter.nim}</td>
                                                <td className="px-6 py-4 text-white font-medium">{voter.name}</td>
                                                <td className="px-6 py-4 text-gray-300">{voter.faculty}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${voter.role === 'admin'
                                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                        : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
                                                        }`}>
                                                        {voter.role === 'admin' ? 'ADMIN' : 'VOTER'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {voter.hasVoted ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
                                                            ✓ SUDAH
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                                                            ✕ BELUM
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
