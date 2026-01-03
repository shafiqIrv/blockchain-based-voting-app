import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Pemira KM ITB | Blockchain-Based Voting System",
	description:
		"Secure and transparent voting system for ITB students powered by Hyperledger Fabric blockchain",
	keywords: ["voting", "blockchain", "ITB", "election", "hyperledger"],
};


export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="id">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				{/* Animated Background */}
				<div className="animated-bg" />

				<AuthProvider>
					{children}
				</AuthProvider>
			</body>
		</html>
	);
}
