"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";

interface Major {
    name: string;
    nimPrefix: string;
}

interface Faculty {
    name: string;
    majors: Major[];
}

export default function RegisterPage() {
    const router = useRouter();
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [nim, setNim] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [selectedFaculty, setSelectedFaculty] = useState("");
    const [selectedMajor, setSelectedMajor] = useState("");
    const [campus, setCampus] = useState("Ganesha");
    const [entryYear, setEntryYear] = useState(new Date().getFullYear());

    useEffect(() => {
        // Fetch faculties on mount
        api.getFaculties()
            .then((data) => setFaculties(data as any))
            .catch((err) => console.error("Failed to fetch faculties", err));
    }, []);

    const handleFacultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedFaculty(e.target.value);
        setSelectedMajor(""); // Reset major when faculty changes
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await api.register({
                name,
                nim,
                email,
                password,
                faculty: selectedFaculty,
                major: selectedMajor,
                campus,
                entry_year: entryYear,
            });

            // Redirect to login on success
            router.push("/login?message=Registration%20successful.%20Please%20login.");
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived state for majors
    const currentMajors = faculties.find((f) => f.name === selectedFaculty)?.majors || [];

    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="glass p-10 max-w-2xl w-full text-center animate-fadeIn border border-white/10 rounded-2xl bg-white/5 backdrop-blur-lg">
                <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6 p-4">
                    <div className="relative w-full h-full">
                        <Image
                            src="/favicon.png"
                            alt="Logo Pemira"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                <p className="text-gray-400 mb-8">Register to vote in Pemira KM ITB</p>


                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ahmad Fauzan"
                            />
                        </div>

                        {/* NIM */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                NIM (8 Digits)
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={8}
                                className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                value={nim}
                                onChange={(e) => setNim(e.target.value)}
                                placeholder="13521001"
                            />
                        </div>

                        {/* Entry Year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Entry Year
                            </label>
                            <input
                                type="number"
                                required
                                min={2000}
                                max={2030}
                                className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                value={entryYear}
                                onChange={(e) => setEntryYear(parseInt(e.target.value))}
                            />
                        </div>

                        {/* Email */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Email (@mahasiswa.itb.ac.id)
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ahmad@mahasiswa.itb.ac.id"
                            />
                        </div>

                        {/* Password */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                            />
                        </div>

                        {/* Faculty */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Faculty
                            </label>
                            <select
                                required
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                value={selectedFaculty}
                                onChange={handleFacultyChange}
                            >
                                <option value="" className="bg-gray-900 text-white">Select Faculty</option>
                                {faculties.map((f) => (
                                    <option key={f.name} value={f.name} className="bg-gray-900 text-white">
                                        {f.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Major */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Major
                            </label>
                            <select
                                required
                                disabled={!selectedFaculty}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50"
                                value={selectedMajor}
                                onChange={(e) => setSelectedMajor(e.target.value)}
                            >
                                <option value="" className="bg-gray-900 text-white">Select Major</option>
                                {currentMajors.map((m) => (
                                    <option key={m.name} value={m.name} className="bg-gray-900 text-white">
                                        {m.name} ({m.nimPrefix})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Campus */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Campus
                            </label>
                            <select
                                required
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                value={campus}
                                onChange={(e) => setCampus(e.target.value)}
                            >
                                <option value="Ganesha" className="bg-gray-900 text-white">Ganesha</option>
                                <option value="Jatinangor" className="bg-gray-900 text-white">Jatinangor</option>
                                <option value="Cirebon" className="bg-gray-900 text-white">Cirebon</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary w-full text-lg py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                    >
                        {isSubmitting ? "Creating Account..." : "Register"}
                    </button>
                </form>

                <div className="mt-8 text-sm text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                        Login here
                    </Link>
                </div>
            </div>
        </main>
    );
}
