"use client";

import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

export function TokenManager() {
    const { isTokenMissing, createIdentity, loadIdentity, logout } = useAuth();
    const [mode, setMode] = useState<"initial" | "load">("initial");
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isTokenMissing) return null;

    const handleCreate = async () => {
        setIsProcessing(true);
        try {
            await createIdentity();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1f2937] border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        {mode === "initial" ? "Setup Voting Identity" : "Load Identity"}
                    </h2>
                    <p className="text-gray-400 text-sm">
                        {mode === "initial"
                            ? "To ensure complete anonymity, you need to create a secure voting token on your device."
                            : "Upload your voting-identity.json file to restore your session."}
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {mode === "initial" ? (
                        <>
                            <button
                                onClick={handleCreate}
                                disabled={isProcessing}
                                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <span>✨ Create New Identity</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setMode("load")}
                                className="w-full py-4 px-6 bg-[#374151] hover:bg-[#4b5563] rounded-xl font-medium text-gray-200 transition-all border border-gray-600"
                            >
                                📂 Load Existing Identity
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="relative">
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
                                    className="block w-full py-8 px-4 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl text-center cursor-pointer transition-colors bg-[#111827]"
                                >
                                    {isProcessing ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2" />
                                            <span className="text-gray-400">Verifying...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-2xl mb-2">📄</div>
                                            <span className="text-blue-400 font-medium">Click to Upload File</span>
                                            <p className="text-gray-500 text-xs mt-1">voting-identity.json</p>
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
                <div className="mt-8 pt-6 border-t border-gray-700 text-center">
                    <button
                        onClick={logout}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                        Cancel & Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
