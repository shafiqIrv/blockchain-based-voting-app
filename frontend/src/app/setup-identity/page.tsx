"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SetupIdentityPage() {
    const { user, isAuthenticated, isTokenMissing, createIdentity, loadIdentity, logout } = useAuth();
    const router = useRouter();
    const [mode, setMode] = useState<"initial" | "load">("initial");
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorState, setErrorState] = useState<"none" | "already_registered">("none");

    // Redirect logic
    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        } else if (user?.role === "admin") { // Admins don't need identity
            router.push("/");
        } else if (!isTokenMissing) {
            router.push("/");
        }
    }, [isAuthenticated, isTokenMissing, router]);

    if (!isAuthenticated || !isTokenMissing) return null;

    const handleCreate = async () => {
        setIsProcessing(true);
        setErrorState("none");
        try {
            await createIdentity();
            // AuthState will update, triggering the redirect above
        } catch (e: any) {
            console.error(e);
            if (e.message && e.message.includes("already registered")) {
                setErrorState("already_registered");
                setMode("load");
            } else {
                alert("Gagal membuat identitas. Coba lagi.");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            await loadIdentity(file);
        } catch (err) {
            alert("Failed to load identity. Please ensure it is a valid voting-identity.json file.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center px-6">
            <div className="max-w-md w-full animate-fadeIn">
                <div className="glass p-8 rounded-2xl shadow-2xl relative">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">🔐</span>
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                            {mode === "initial" ? "Setup Voting Identity" : "Load Identity"}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {mode === "initial"
                                ? "To ensure complete anonymity, you need to create a secure voting token on your device."
                                : "Upload your voting-identity.json file to restore your session."}
                        </p>
                    </div>

                    {/* Error Message UI */}
                    {errorState === "already_registered" && (
                        <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div className="text-left">
                                <h3 className="text-orange-400 font-semibold text-sm">Already Registered</h3>
                                <p className="text-gray-400 text-xs mt-1">
                                    Our records show you have already created an identity.
                                    Please <b>upload your saved identity file</b> to continue.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="space-y-4">
                        {mode === "initial" ? (
                            <>
                                <button
                                    onClick={handleCreate}
                                    disabled={isProcessing}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 group"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Creating Secure Token...
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-lg">✨</span>
                                            <span>Create New Identity</span>
                                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => setMode("load")}
                                    className="w-full py-4 px-6 bg-[#374151]/50 hover:bg-[#374151] rounded-xl font-medium text-gray-300 transition-all border border-gray-600 hover:border-gray-500 flex items-center justify-center gap-2"
                                >
                                    <span>📂</span>
                                    <span>Load Existing Identity</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="identity-upload"
                                        disabled={isProcessing}
                                    />
                                    <label
                                        htmlFor="identity-upload"
                                        className="block w-full py-10 px-4 border-2 border-dashed border-gray-600 hover:border-blue-500 group-hover:bg-[#1f2937]/50 rounded-xl text-center cursor-pointer transition-all"
                                    >
                                        {isProcessing ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3" />
                                                <span className="text-gray-400">Verifying Identity...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-4xl mb-3 grayscale group-hover:grayscale-0 transition-all">📄</div>
                                                <span className="text-blue-400 font-medium block">Click to Upload File</span>
                                                <p className="text-gray-500 text-xs mt-2">Select your voting-identity.json</p>
                                            </>
                                        )}
                                    </label>
                                </div>

                                <button
                                    onClick={() => setMode("initial")}
                                    className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
                                >
                                    ← Back to Options
                                </button>
                            </>
                        )}
                    </div>

                    {/* Footer / Logout */}
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <button
                            onClick={logout}
                            className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            <span>🚪</span>
                            Cancel & Logout
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
