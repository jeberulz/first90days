import { Inter } from "next/font/google"; // Using Inter as requested
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

// We can load other fonts if needed, but Inter is the primary one requested.

export const metadata = {
  title: "First90 - AI Onboarding Planner",
  description: "Your first 90 days, engineered for impact.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
