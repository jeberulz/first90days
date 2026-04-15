import Script from "next/script";
import { Inter, Instrument_Serif, Space_Grotesk } from "next/font/google";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import IconifyProvider from "@/components/providers/IconifyProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const themeInit = `
try {
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch (e) {}
`;

export const metadata = {
  title: "First90 - AI Onboarding Planner",
  description: "Your first 90 days, engineered for impact.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F2E8" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0E0D" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${spaceGrotesk.variable} font-sans antialiased selection:bg-[#D97757]/20 selection:text-[#D97757] text-[#1C1917] dark:text-[#E7E5E4]`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <IconifyProvider>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </IconifyProvider>
      </body>
    </html>
  );
}
