"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Election, Voter } from "@/lib/api";

export default function AdminPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();
    const [election, setElection] = useState<Election | null>(null);
    const [activeTab, setActiveTab] = useState<"config" | "voters" | "candidates">("config");

    // Config State
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Candidates State
    const [isAddingCandidate, setIsAddingCandidate] = useState(false);
    const [newCandidate, setNewCandidate] = useState({ name: "", vision: "", imageUrl: "" });

    // Voters State
    const [voters, setVoters] = useState<Voter[]>([]);
    const [isLoadingVoters, setIsLoadingVoters] = useState(false);
    const [selectedMajor, setSelectedMajor] = useState("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false); // New state for custom dropdown
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Computed unique majors for filter
    const uniqueMajors = Array.from(new Set(voters.map(v => v.major).filter(Boolean))).sort();

    // Create a map of Major -> NIM Prefix (taking first 3 chars of first matching voter's NIM)
    const majorPrefixMap = new Map<string, string>();
    voters.forEach(v => {
        if (v.major && !majorPrefixMap.has(v.major)) {
            majorPrefixMap.set(v.major, v.nim.substring(0, 3));
        }
    });

    const filteredVoters = voters
        .filter(v => {
            if (selectedMajor === "all") return true;
            return v.major === selectedMajor;
        })
        .sort((a, b) => a.nim.localeCompare(b.nim)); // Sort by NIM Ascending

    // Pagination Logic
    const totalPages = Math.ceil(filteredVoters.length / itemsPerPage);
    const currentVoters = filteredVoters.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5; // e.g., 1 ... 4 5 6 ... 10

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always include first, last, current, and neighbors
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push("...");
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push("...");
                pages.push(totalPages);
            }
        }
        return pages;
    };

    // Reset pagination and close dropdown when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setIsFilterOpen(false);
    }, [selectedMajor]);

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

            // Convert UTC to "Local ISO" for datetime-local input
            // 1. Get Date object (which works in local time)
            // 2. Adjust it by subtracting timezone offset so .toISOString() returns local time values
            const startD = new Date(data.startTime);
            const endD = new Date(data.endTime);

            const startLocal = new Date(startD.getTime() - (startD.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            const endLocal = new Date(endD.getTime() - (endD.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

            setStartDate(startLocal);
            setEndDate(endLocal);

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

    const handleAddCandidate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!election) return;

        setIsSubmitting(true);
        setError("");

        try {
            await api.addCandidate(election.id, newCandidate);
            setSuccess("Candidate added successfully!");
            setIsAddingCandidate(false);
            setNewCandidate({ name: "", vision: "", imageUrl: "" });
            loadData(); // Refresh data
        } catch (err: any) {
            setError(err.message || "Failed to add candidate");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCandidate = async (candidateId: string) => {
        if (!election || !confirm("Are you sure you want to delete this candidate?")) return;

        try {
            await api.deleteCandidate(election.id, candidateId);
            loadData(); // Refresh data
        } catch (err: any) {
            alert(err.message || "Failed to delete candidate");
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
            setSuccess("Jadwal pemilihan berhasil diperbarui! Halaman akan dimuat ulang...");

            // Artificial delay for better UX
            await new Promise(resolve => setTimeout(resolve, 1000));

            window.location.reload();
        } catch (err: any) {
            setError(err.message || "Failed to update election");
        } finally {
            setIsSubmitting(false);
        }
    };

    const setStartToNow = () => {
        // Create date adjusted to local timezone string format for input
        // The input datetime-local expects YYYY-MM-DDThh:mm
        const now = new Date();
        const localIsoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setStartDate(localIsoString);
    };

    const setEndToNow = () => {
        const now = new Date();
        const localIsoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setEndDate(localIsoString);
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
                        <button
                            onClick={() => setActiveTab("candidates")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === "candidates" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                }`}
                        >
                            👔 Kandidat
                        </button>
                    </div>
                </div>

                {activeTab === "config" ? (
                    <div className="glass p-8 rounded-2xl border border-white/10 bg-white/5 animate-fadeIn">
                        <h2 className="text-xl font-semibold text-white mb-6">Konfigurasi Pemilihan</h2>

                        {election && (
                            <div className="space-y-8">
                                {/* Current Status Display */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-sm text-gray-400">Status Saat Ini</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${election.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : election.status === 'PENDING' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                                            <span className="text-white font-medium">{election.status}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Server Time (Estimasi)</p>
                                        <div className="text-indigo-300 font-mono mt-1">
                                            {new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' })}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 border-t border-white/5 pt-3">
                                        <p className="text-xs text-gray-500 mb-1">Jadwal Terdaftar:</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-300">
                                                Mulai: <span className="text-white">{new Date(election.startTime).toLocaleString('id-ID')}</span>
                                            </span>
                                            <span className="text-gray-300">
                                                Selesai: <span className="text-white">{new Date(election.endTime).toLocaleString('id-ID')}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6 border-t border-white/10 pt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-sm font-medium text-gray-300">
                                                    Waktu Mulai
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={setStartToNow}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                                                >
                                                    Set Sekarang
                                                </button>
                                            </div>
                                            <input
                                                type="datetime-local"
                                                required
                                                className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-sm font-medium text-gray-300">
                                                    Waktu Selesai
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={setEndToNow}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                                                >
                                                    Set Sekarang
                                                </button>
                                            </div>
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
                                            className="btn btn-primary px-8 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Menyimpan...</span>
                                                </>
                                            ) : (
                                                "Simpan Perubahan Jadwal"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                ) : activeTab === "candidates" ? (
                    /* Candidates Management */
                    <div className="animate-fadeIn space-y-8">
                        {election?.status === "ACTIVE" && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex items-center gap-3">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <h3 className="text-yellow-400 font-bold">Pemilihan Sedang Berlangsung</h3>
                                    <p className="text-gray-400 text-sm">
                                        Perubahan pada kandidat tidak diizinkan selama periode pemilihan aktif untuk menjaga integritas data.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Add Candidate Form */}
                        {election?.status !== "ACTIVE" && (
                            !isAddingCandidate ? (
                                <button
                                    onClick={() => setIsAddingCandidate(true)}
                                    className="w-full py-4 border-2 border-dashed border-white/20 rounded-2xl text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition flex items-center justify-center gap-2 group"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition">+</span>
                                    <span className="font-medium">Tambah Kandidat Baru</span>
                                </button>
                            ) : (
                                <div className="glass p-8 rounded-2xl border border-white/10 bg-white/5">
                                    <h2 className="text-xl font-semibold text-white mb-6">Tambah Kandidat</h2>
                                    <form onSubmit={handleAddCandidate} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Nama Kandidat</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                                value={newCandidate.name}
                                                onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                                                placeholder="Nama lengkap kandidat"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Visi & Misi</label>
                                            <textarea
                                                required
                                                rows={4}
                                                className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                                value={newCandidate.vision}
                                                onChange={(e) => setNewCandidate({ ...newCandidate, vision: e.target.value })}
                                                placeholder="Deskripsikan visi dan misi kandidat..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">URL Foto (Opsional)</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                                value={newCandidate.imageUrl}
                                                onChange={(e) => setNewCandidate({ ...newCandidate, imageUrl: e.target.value })}
                                                placeholder="/candidates/foto.jpg"
                                            />
                                        </div>

                                        {error && <p className="text-red-400 text-sm">{error}</p>}
                                        {success && <p className="text-green-400 text-sm">{success}</p>}

                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingCandidate(false)}
                                                className="px-6 py-2 rounded-xl text-gray-400 hover:text-white transition"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="btn btn-primary px-8 py-2 rounded-xl"
                                            >
                                                {isSubmitting ? "Menyimpan..." : "Simpan Kandidat"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )
                        )}

                        {/* Candidates List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {election?.candidates.map((candidate) => (
                                <div key={candidate.id} className="glass p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                            {candidate.name.charAt(0)}
                                        </div>
                                        {election?.status !== "ACTIVE" && (
                                            <button
                                                onClick={() => handleDeleteCandidate(candidate.id)}
                                                className="text-gray-500 hover:text-red-400 transition"
                                                title="Hapus Kandidat"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{candidate.name}</h3>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1">{candidate.vision}</p>
                                    <div className="mt-auto pt-4 border-t border-white/5">
                                        <div className="text-xs text-gray-500">ID: {candidate.id}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Voters List */
                    <div className="glass rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-fadeIn">
                        <div className="p-6 border-b border-white/10">
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-semibold text-white">Daftar Pemilih ({filteredVoters.length})</h2>
                                    {/* Major Filter */}
                                    {/* Major Filter Custom Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                                            className="flex items-center justify-between gap-2 px-4 py-2 bg-[#1a1a20] border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white hover:border-white/20 transition min-w-[200px]"
                                        >
                                            <span className="truncate max-w-[200px]">
                                                {selectedMajor === "all"
                                                    ? "Semua Jurusan"
                                                    : `[${majorPrefixMap.get(selectedMajor)}] ${selectedMajor}`}
                                            </span>
                                            <svg className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </button>

                                        {isFilterOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setIsFilterOpen(false)}
                                                ></div>
                                                <div className="absolute top-full mt-2 w-full min-w-[240px] right-0 max-h-60 overflow-y-auto bg-[#1a1a20] border border-white/10 rounded-lg shadow-xl z-20">
                                                    <button
                                                        onClick={() => setSelectedMajor("all")}
                                                        className={`w-full text-left px-4 py-2 text-sm transition ${selectedMajor === "all" ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-white/5"
                                                            }`}
                                                    >
                                                        Semua Jurusan
                                                    </button>
                                                    {uniqueMajors.map(major => (
                                                        <button
                                                            key={major}
                                                            onClick={() => setSelectedMajor(major)}
                                                            className={`w-full text-left px-4 py-2 text-sm transition border-t border-white/5 ${selectedMajor === major ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-white/5"
                                                                }`}
                                                        >
                                                            <span className="opacity-50 mr-2">[{majorPrefixMap.get(major)}]</span>
                                                            {major}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-4 text-sm mt-2 md:mt-0">
                                    <span className="flex items-center gap-2 text-green-400">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Sudah Mencoblos: {filteredVoters.filter(v => v.hasVoted).length}
                                    </span>
                                    <span className="flex items-center gap-2 text-yellow-400">
                                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                        Sudah Registrasi: {filteredVoters.filter(v => v.hasIdentity && !v.hasVoted).length}
                                    </span>
                                    <span className="flex items-center gap-2 text-gray-400">
                                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                        Belum Hadir: {filteredVoters.filter(v => !v.hasIdentity && !v.hasVoted).length}
                                    </span>
                                </div>
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
                                            <th className="px-6 py-4 font-medium">Jurusan</th>
                                            <th className="px-6 py-4 font-medium">Peran</th>
                                            <th className="px-6 py-4 font-medium text-center">Status Voting</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {currentVoters.map((voter) => (
                                            <tr key={voter.nim} className="hover:bg-white/5 transition">
                                                <td className="px-6 py-4 font-mono text-indigo-300">{voter.nim}</td>
                                                <td className="px-6 py-4 text-white font-medium">{voter.name}</td>
                                                <td className="px-6 py-4 text-gray-300">{voter.faculty}</td>
                                                <td className="px-6 py-4 text-gray-300 text-sm">{voter.major}</td>
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
                                                            ✓ MENCOBLOS
                                                        </span>
                                                    ) : voter.hasIdentity ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                                                            ⚠️ REGISTRASI
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold border border-gray-500/30">
                                                            ✕ ABSEN
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {!isLoadingVoters && filteredVoters.length > 0 && (
                            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/5">
                                <span className="text-sm text-gray-400">
                                    Halaman {currentPage} dari {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 rounded-lg text-sm bg-white/5 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
                                    >
                                        &laquo; Prev
                                    </button>

                                    {getPageNumbers().map((page, index) => (
                                        typeof page === 'number' ? (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition ${currentPage === page
                                                        ? "bg-indigo-600 text-white shadow-lg"
                                                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ) : (
                                            <span key={index} className="px-2 text-gray-600">...</span>
                                        )
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 rounded-lg text-sm bg-white/5 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
                                    >
                                        Next &raquo;
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main >
    );
}
