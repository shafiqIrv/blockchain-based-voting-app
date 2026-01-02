"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Election } from "@/lib/api";

export default function AdminPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();
    const [election, setElection] = useState<Election | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
            router.push("/");
        }
    }, [isLoading, isAuthenticated, user, router]);

    useEffect(() => {
        if (isAuthenticated && user?.role === "admin") {
            api.getCurrentElection().then((data) => {
                setElection(data);
                // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
                setStartDate(new Date(data.startTime).toISOString().slice(0, 16));
                setEndDate(new Date(data.endTime).toISOString().slice(0, 16));
            });
        }
    }, [isAuthenticated, user]);

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
        <main className="min-h-screen px-6 py-24 bg-gray-900">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

                {/* Election Control Card */}
                <div className="glass p-8 rounded-2xl border border-white/10 bg-white/5">
                    <h2 className="text-xl font-semibold text-white mb-6">Election Configuration</h2>

                    {election && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Start Date & Time
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
                                        End Date & Time
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
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
