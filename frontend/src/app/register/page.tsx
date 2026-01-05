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
    const [confirmPassword, setConfirmPassword] = useState("");
    const [selectedFaculty, setSelectedFaculty] = useState("");
    const [selectedMajor, setSelectedMajor] = useState("");
    const [campus, setCampus] = useState("Ganesha");
    const [entryYear, setEntryYear] = useState(new Date().getFullYear());

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setIsSubmitting(false);
            return;
        }

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
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition pr-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 6 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    className="w-full px-4 py-3 bg-black/20 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition pr-12"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                                >
                                    {showConfirmPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
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
