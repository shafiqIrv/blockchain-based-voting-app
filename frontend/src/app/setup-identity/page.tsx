"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SetupIdentityPage() {
    const { user, isAuthenticated, isTokenMissing, createIdentity, loadIdentity, logout, downloadIdentityFile, tokenId, signature } = useAuth();
    const router = useRouter();
    const [mode, setMode] = useState<"initial" | "load" | "success">("initial");
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorState, setErrorState] = useState<"none" | "already_registered" | "wrong_owner">("none");
    const [errorDetail, setErrorDetail] = useState("");
    const [hasDownloaded, setHasDownloaded] = useState(false);

    // Redirect logic
    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        } else if (user?.role === "admin") { // Admins don't need identity
            router.push("/");
        } else if (!isTokenMissing && mode !== "success") {
            router.push("/");
        }
    }, [isAuthenticated, isTokenMissing, router, mode, user]);

    if (!isAuthenticated || (!isTokenMissing && mode !== "success")) return null;

    const handleCreate = async () => {
        setIsProcessing(true);
        setErrorState("none");
        try {
            await createIdentity();
            setMode("success");
            setHasDownloaded(false);
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

    const handleDownload = () => {
        if (tokenId && signature) {
            // Get NIM from user object (should be available since logged in)
            downloadIdentityFile(tokenId, signature, (user as any)?.nim || "voting");
            setHasDownloaded(true);
        }
    };

    const handleContinue = () => {
        router.push("/");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setErrorState("none"); // Reset previous errors

        try {
            await loadIdentity(file);
        } catch (err: any) {
            console.error("Upload error:", err);
            if (err.message && err.message.includes("belongs to another user")) {
                setErrorState("wrong_owner");
                // Extract relevant part of message if needed, or just use full message
                setErrorDetail(err.message);
            } else {
                alert("Failed to load identity. Please ensure it is a valid voting-identity.json file.");
            }
        } finally {
            setIsProcessing(false);
            // Reset the input so user can select same file again if they want
            e.target.value = "";
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

                    {/* Error Message UI: Wrong Owner */}
                    {errorState === "wrong_owner" && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                            <span className="text-2xl">⛔</span>
                            <div className="text-left">
                                <h3 className="text-red-400 font-semibold text-sm">Identity Mismatch</h3>
                                <p className="text-gray-400 text-xs mt-1">
                                    {errorDetail || "This identity file does not belong to you."}
                                </p>
                                <p className="text-gray-500 text-[10px] mt-1">
                                    Please upload the file linked to your current login (NIM).
                                </p>
                            </div>
                        </div>
                    )}


                    {/* Content */}
                    <div className="space-y-4">
                        {mode === "success" ? (
                            <div className="text-center animate-fadeIn">
                                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">✓</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Identity Created!</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Your anonymous voting identity is ready. <br />
                                    Please download your identity file and keep it safe.
                                </p>

                                <button
                                    onClick={handleDownload}
                                    className="w-full py-3 px-6 bg-green-600 hover:bg-green-500 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 mb-3"
                                >
                                    <span>⬇️</span>
                                    <span>Download Identity File</span>
                                </button>

                                <button
                                    onClick={handleContinue}
                                    disabled={!hasDownloaded}
                                    className={`w-full py-3 px-6 rounded-xl font-medium transition-all ${hasDownloaded
                                        ? "bg-white/10 hover:bg-white/20 text-white"
                                        : "bg-white/5 text-gray-500 cursor-not-allowed"
                                        }`}
                                >
                                    Continue to App →
                                </button>
                            </div>
                        ) : mode === "initial" ? (
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
