import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {BlueControl} from "@/app/blueControl"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "micro:bit-ble",
  description: "micro:bit bluetooth console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
				<div className="fixed top-1 left-1 z-50 bg-white/50 p-1 shadow-lg h-fit w-fit">
					<BlueControl />
				</div>
        {children}
      </body>
    </html>
  );
}
