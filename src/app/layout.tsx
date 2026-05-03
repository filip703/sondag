import type { Metadata } from "next";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Söndag — veckomeny för familjen",
  description: "Planera veckans mat. Synka inköpslistan till ICA. Glöm aldrig vad som finns hemma.",
  themeColor: "#F4ECDF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
